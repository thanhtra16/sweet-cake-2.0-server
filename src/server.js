const app = require("./app");
const connectDB = require("./config/database");
const { PORT } = require("./config/env");

const startServer = async () => {
  try {
    // Kết nối MongoDB trước
    await connectDB();

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