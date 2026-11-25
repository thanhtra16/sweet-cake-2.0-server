const Setting = require("../../models/settings");

const defaultSettings = {
  minLeadHours: 24,
  maxAdvanceDays: 7,
  deliveryFee: 30000, // Phí giao hàng mặc định (VNĐ)
  deliveryCity: "TP.HCM",

  // Danh sách chi nhánh SweetCake tại TP.HCM (địa chỉ 2 cấp: Phường/Xã - TP. Hồ Chí Minh)
  branches: [
    {
      name: "SweetCake Thủ Đức",
      address: "669 Đỗ Mười, Phường Linh Xuân, TP.HCM",
      phone: "028 7300 1234",
    },
    {
      name: "SweetCake Quận 1",
      address: "45 Lê Lợi, Phường Bến Nghé, TP.HCM",
      phone: "028 7300 5678",
    },
  ],

  // Khai báo các khung giờ nhận bánh mặc định
  slotTemplates: [
    { label: "09:00 - 11:00", capacity: 5 },
    { label: "11:00 - 13:00", capacity: 5 },
    { label: "13:00 - 15:00", capacity: 5 },
    { label: "15:00 - 17:00", capacity: 5 },
    { label: "17:00 - 19:00", capacity: 5 },
  ],

  workingHours: {},
  qrExpireMinutes: 10,
  maxQrRetries: 3,
  hotline: "1900 1234",
  refundPolicy: {
    acceptedPercent: 30,
    inProgressPercent: 0,
    shopFaultPercent: 100,
  },
  refundDueWorkingDays: 3,
};

async function seedSettings() {
  const setting = await Setting.findOneAndUpdate(
    {},
    { $set: defaultSettings },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    }
  );

  console.log("Seed Settings thành công:", setting._id);
}

module.exports = seedSettings;