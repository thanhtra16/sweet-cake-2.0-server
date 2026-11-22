const mongoose = require("mongoose");
const connectDB = require("../config/database");

// Import các file Seed
const seedSettings = require("./data/settings.seed");
const seedAdmin = require("./data/admin.seed");
const seedUsers = require("./data/users.seed");
const seedCustomizations = require("./data/customizations.seed");
const seedProducts = require("./data/products.seed");
const seedVouchers = require("./data/vouchers.seed");
const seedPosts = require("./data/posts.seed");
const seedFAQs = require("./data/faqs.seed");
const seedTimeSlots = require("./data/timeslots.seed");
const seedOrders = require("./data/orders.seed");
const seedNotifications = require("./data/notifications.seed");


const runSeed = async () => {
  try {
    await connectDB();

    // Chạy riêng seed sản phẩm nếu có tham số "products"
    const onlyProducts = process.argv[2] === "products";

    if (onlyProducts) {
      console.log("\n========== BẮT ĐẦU SEED PRODUCTS ==========\n");

      await seedProducts();

      console.log("\n========== SEED PRODUCTS HOÀN TẤT ==========\n");
      return;
    }

    // Mặc định: chạy toàn bộ seed
    console.log("\n========== BẮT ĐẦU SEED DATA ==========\n");

    await seedSettings();
    await seedAdmin();
    await seedUsers();
    await seedCustomizations();
    await seedProducts();
    await seedVouchers();
    await seedPosts();
    await seedFAQs();
    await seedTimeSlots();
    await seedOrders();
    await seedNotifications();

    console.log("\n========== SEED DATA HOÀN TẤT ==========\n");
  } catch (error) {
    console.error("\n========== SEED DATA THẤT BẠI ==========");
    console.error(error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log("Đã ngắt kết nối MongoDB.");
  }
};

runSeed();
