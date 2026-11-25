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

    // Quét QR hết hạn định kỳ. Đây là bộ hẹn giờ demo; production nên chuyển sang worker/queue.
    const paymentService = require("./services/payment.service");
    let paymentSweepRunning = false;
    const paymentSweepTimer = setInterval(async () => {
      if (paymentSweepRunning) return;
      paymentSweepRunning = true;
      try {
        await paymentService.sweepExpiredPayments();
      } catch (error) {
        console.error("[payment] Payment expiry sweep failed:", error);
      } finally {
        paymentSweepRunning = false;
      }
    }, 30 * 1000);
    paymentSweepTimer.unref();
  } catch (error) {
    console.error("Cannot start server:", error.message);
    process.exit(1);
  }
};

startServer();