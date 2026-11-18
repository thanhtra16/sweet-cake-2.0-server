const User = require("../../models/users");
const bcrypt = require("bcryptjs");

const defaultUsers = [
  {
    fullName: "Nguyễn Minh Anh",
    phone: "0900000001",
    email: "minhanh@example.com",
    password: "Customer@123",
  },
  {
    fullName: "Trần Hoàng Nam",
    phone: "0900000002",
    email: "hoangnam@example.com",
    password: "Customer@123",
  },
];

// async function seedUsers() {
//   for (const userData of defaultUsers) {
//     const existingUser = await User.findOne({
//       phone: userData.phone,
//     });

//     if (existingUser) {
//       console.log(`User ${userData.phone} đã tồn tại, bỏ qua.`);
//       continue;
//     }

//     const passwordHash = await bcrypt.hash(userData.password, 10);

//     await User.create({
//       fullName: userData.fullName,
//       phone: userData.phone,
//       email: userData.email,
//       passwordHash,
//       role: "buyer",
//       isLocked: false,
//       origin: "register",
//     });

//     console.log(`Đã tạo User: ${userData.phone}`);
//   }
// }

async function seedUsers() {
  let upsertedCount = 0;
  let modifiedCount = 0;
  
  // Công tắc ép ghi đè mật khẩu khi team thống nhất đổi pass mặc định
  const forceResetPassword = process.env.SEED_RESET_PASSWORD === 'true';

  try {
    for (const userData of defaultUsers) {
      // Tính toán sẵn mã băm (dù update hay insert đều tính, chấp nhận trade-off nhỏ về CPU để code đơn giản)
      const passwordHash = await bcrypt.hash(userData.password, 10);

      const updateDoc = {
        $set: {
          fullName: userData.fullName,
          email: userData.email,
        },
        $setOnInsert: {
          role: "buyer",
          origin: "register",
          isLocked: false,
        }
      };

      // Quyết định nơi đặt passwordHash dựa trên công tắc
      if (forceResetPassword) {
        updateDoc.$set.passwordHash = passwordHash;
      } else {
        updateDoc.$setOnInsert.passwordHash = passwordHash;
      }

      const result = await User.updateOne(
        { phone: userData.phone },
        updateDoc,
        { upsert: true }
      );

      // Đếm log thực tế từ response của Mongoose
      if (result.upsertedCount > 0) upsertedCount++;
      if (result.modifiedCount > 0) modifiedCount++;
    }
    
    console.log(`Seed Users hoàn tất: Tạo mới ${upsertedCount} | Cập nhật ${modifiedCount} (Tổng seed: ${defaultUsers.length}).`);
    
  } catch (error) {
    // Cảnh báo rõ ràng nếu dính lỗi Unique Index của Email
    if (error.code === 11000) {
      console.error(`Lỗi Seed Users (E11000): Trùng lặp dữ liệu. Có thể một tài khoản thực tế đã sử dụng email của user seed.`);
    } else {
      console.error(`Lỗi khi đồng bộ Users:`, error);
    }
    throw error;
  }
}

module.exports = seedUsers;