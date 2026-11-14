const bcrypt = require("bcryptjs");
const User = require("../../models/users");

async function seedAdmin() {
  const phone = process.env.ADMIN_PHONE;
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!phone || !email || !password) {
    throw new Error("Thiếu thông tin ADMIN trong file .env");
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const admin = await User.findOneAndUpdate(
    { phone },
    {
      $setOnInsert: {
        fullName: "Quản trị viên SweetCake",
        phone,
        email,
        passwordHash,
        role: "admin",
        isLocked: false,
        origin: "register",
      },
    },
    {
      upsert: true,
      new: true,
      runValidators: true,
    }
  );

  console.log("Seed Admin thành công:", admin.phone);
}

module.exports = seedAdmin;