if (process.env.ALLOW_RESET !== 'true') {
  console.error('🚫 CẢNH BÁO: Lệnh Reset Database đã bị khóa để bảo vệ dữ liệu dùng chung của team!');
  console.error('💡 Để ép chạy (chỉ làm trước ngày demo hoặc khi DB lỗi nặng), hãy chạy lệnh:');
  console.error('👉 Kéo terminal gõ: ALLOW_RESET=true node src/seed/reset.js (hoặc npm run reset)');
  process.exit(1); 
}