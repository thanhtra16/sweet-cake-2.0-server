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

async function seedUsers() {
  for (const userData of defaultUsers) {
    const existingUser = await User.findOne({
      phone: userData.phone,
    });

    if (existingUser) {
      console.log(`User ${userData.phone} đã tồn tại, bỏ qua.`);
      continue;
    }

    const passwordHash = await bcrypt.hash(userData.password, 10);

    await User.create({
      fullName: userData.fullName,
      phone: userData.phone,
      email: userData.email,
      passwordHash,
      role: "buyer",
      isLocked: false,
      origin: "register",
    });

    console.log(`Đã tạo User: ${userData.phone}`);
  }
}

module.exports = seedUsers;