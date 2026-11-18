const Customization = require("../../models/customizations");

const defaultCustomizations = {
  sizes: [
    { name: "18cm", priceDiff: 0, isDefault: true, active: true },
    { name: "20cm", priceDiff: 0, isDefault: false, active: true },
    { name: "22cm", priceDiff: 0, isDefault: false, active: true },
  ],

  fillings: [
    { name: "Bắp", priceDiff: 0, isDefault: false, active: true },
    { name: "Matcha", priceDiff: 0, isDefault: false, active: true },
    { name: "Phô mai", priceDiff: 0, isDefault: false, active: true },
    { name: "Trái cây tươi", priceDiff: 0, isDefault: false, active: true },
    { name: "Socola", priceDiff: 0, isDefault: false, active: true },
    { name: "Mứt dâu tây", priceDiff: 0, isDefault: false, active: true },
  ],

  bases: [
    { name: "Bông lan", priceDiff: 0, isDefault: true, active: true },
    { name: "Mousse", priceDiff: 0, isDefault: false, active: true },
    { name: "Phô mai", priceDiff: 0, isDefault: false, active: true },
    { name: "Bento", priceDiff: 0, isDefault: false, active: true },
  ],

  frostingColors: [
    { name: "Trắng", priceDiff: 0, isDefault: true, active: true },
    { name: "Hồng", priceDiff: 0, isDefault: false, active: true },
    { name: "Xanh dương", priceDiff: 0, isDefault: false, active: true },
    { name: "Vàng", priceDiff: 0, isDefault: false, active: true },
  ],

  sweetnessLevels: [
    { name: "30%", priceDiff: 0, isDefault: false, active: true },
    { name: "50%", priceDiff: 0, isDefault: true, active: true },
    { name: "100%", priceDiff: 0, isDefault: false, active: true },
  ],

  required: {
    base: true,
    frostingColor: false,
    sweetness: false,
  },

  bannedWords: [],
};

async function seedCustomizations() {
  const customization = await Customization.findOneAndUpdate(
    {},
    {
      $set: defaultCustomizations
    },
    {
      upsert: true,
      new: true,
      runValidators: true,
    }
  );

  console.log("Seed Customization thành công, cấu hình đã được đồng bộ:", customization._id)
}

module.exports = seedCustomizations;