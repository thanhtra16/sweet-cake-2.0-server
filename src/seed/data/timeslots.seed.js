const TimeSlot = require("../../models/timeslots");
const Setting = require("../../models/settings");

const defaultSlotTemplates = [
  { label: "09:00 - 11:00", capacity: 5 },
  { label: "11:00 - 13:00", capacity: 5 },
  { label: "13:00 - 15:00", capacity: 5 },
  { label: "15:00 - 17:00", capacity: 5 },
  { label: "17:00 - 19:00", capacity: 5 },
];

async function seedTimeSlots() {
  const setting = await Setting.findOne();

  if (!setting) {
    throw new Error("Chưa có Settings. Hãy chạy seed Settings trước.");
  }

  // Nếu Settings chưa có khung giờ mẫu thì bổ sung dữ liệu mặc định.
  if (!setting.slotTemplates || setting.slotTemplates.length === 0) {
    setting.slotTemplates = defaultSlotTemplates;
    await setting.save();

    console.log("Đã bổ sung Slot Templates vào Settings.");
  }

  const templates = setting.slotTemplates;
  const maxAdvanceDays = setting.maxAdvanceDays || 30;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const operations = [];

  // Tạo TimeSlot từ ngày mai đến ngày thứ maxAdvanceDays.
  for (let day = 1; day <= maxAdvanceDays; day++) {
    const slotDate = new Date(today);
    slotDate.setDate(today.getDate() + day);

    for (const template of templates) {
      operations.push({
        updateOne: {
          filter: {
            date: slotDate,
            label: template.label,
          },
          update: {
            $setOnInsert: {
              date: slotDate,
              label: template.label,
              capacity: template.capacity,
              used: 0,
              closed: false,
            },
          },
          upsert: true,
        },
      });
    }
  }

  if (operations.length > 0) {
    await TimeSlot.bulkWrite(operations);
  }

  console.log(
    `Seed TimeSlots thành công: đã kiểm tra ${operations.length} khung giờ.`
  );
}

module.exports = seedTimeSlots;