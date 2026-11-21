const dns = require("node:dns");
dns.setServers(["1.1.1.1"]);

const app = require("./app");
const connectDB = require("./config/database");
const { PORT } = require("./config/env");
const { initGridFS } = require("./config/gridfs");

const startServer = async () => {
  try {
    // Kết nối MongoDB trước
    await connectDB();
    // Khởi tạo GridFS
    initGridFS();

    // Khởi động Express server
    app.listen(PORT, () => {
      console.log(`Server is running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Cannot start server:", error.message);
    process.exit(1);
  }
};

startServer();