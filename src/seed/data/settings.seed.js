const Setting = require("../../models/settings");

const defaultSettings = {
  minLeadHours: 24,
  maxAdvanceDays: 30,
  deliveryFee: 0, // Giá trị tạm thời, cần thay bằng phí giao hàng thực tế
  deliveryCity: "TP.HCM",

  branches: [],

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
  hotline: "",
  refundPolicy: {
    acceptedPercent: 30,
    inProgressPercent: 0,
    shopFaultPercent: 100,
  },
  refundDueWorkingDays: 3,

  qrExpireMinutes: 10,
  maxQrRetries: 3,

  hotline: "",
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