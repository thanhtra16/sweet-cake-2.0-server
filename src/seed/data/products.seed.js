const Product = require("../../models/products");
const Media = require("../../models/media");

const defaultProducts = [
  // =========================
  // BÁNH KEM
  // =========================
  {
    name: "Bánh kem sinh nhật hoa tươi",
    kind: "cake",
    category: "Bánh sinh nhật",
    occasions: ["Sinh nhật", "Kỷ niệm"],
    description: "Bánh kem trang trí hoa tươi, phù hợp cho các dịp sinh nhật và kỷ niệm.",
    basePrice: 350000,
    salePrice: null,
    status: "visible",
    featured: true,
    imageIds: [],
    availableSizes: ["10cm", "14cm", "18cm", "22cm"],
    availableFillings: ["Bắp", "Matcha", "Phô mai", "Trái cây tươi", "Socola", "Mứt dâu tây"],
    variants: [],
  },
  {
    name: "Bánh kem socola",
    kind: "cake",
    category: "Bánh sinh nhật",
    occasions: ["Sinh nhật", "Kỷ niệm"],
    description: "Bánh kem vị socola với lớp kem mềm mịn.",
    basePrice: 320000,
    salePrice: null,
    status: "visible",
    featured: true,
    imageIds: [],
    availableSizes: ["10cm", "14cm", "18cm", "22cm"],
    availableFillings: ["Socola", "Phô mai", "Bắp", "Mứt dâu tây"],
    variants: [],
  },
  {
    name: "Bánh kem trái cây",
    kind: "cake",
    category: "Bánh sinh nhật",
    occasions: ["Sinh nhật", "Kỷ niệm", "Chúc mừng"],
    description: "Bánh kem trang trí trái cây tươi, mang hương vị thanh nhẹ.",
    basePrice: 330000,
    salePrice: null,
    status: "visible",
    featured: true,
    imageIds: [],
    availableSizes: ["10cm", "14cm", "18cm", "22cm"],
    availableFillings: ["Trái cây tươi", "Bắp", "Phô mai", "Mứt dâu tây"],
    variants: [],
  },
  {
    name: "Bánh mousse matcha",
    kind: "cake",
    category: "Bánh mousse",
    occasions: ["Sinh nhật", "Kỷ niệm"],
    description: "Bánh mousse matcha có kết cấu mềm mịn và hương vị trà xanh.",
    basePrice: 300000,
    salePrice: null,
    status: "visible",
    featured: false,
    imageIds: [],
    availableSizes: ["10cm", "14cm", "18cm", "22cm"],
    availableFillings: ["Matcha", "Phô mai", "Mứt dâu tây"],
    variants: [],
  },
  {
    name: "Bánh Bento",
    kind: "cake",
    category: "Bánh Bento",
    occasions: ["Sinh nhật", "Kỷ niệm", "Chúc mừng"],
    description: "Bánh kem Bento kích thước nhỏ, phù hợp cho những dịp đặc biệt.",
    basePrice: 150000,
    salePrice: null,
    status: "visible",
    featured: false,
    imageIds: [],
    availableSizes: ["10cm"],
    availableFillings: ["Bắp", "Matcha", "Phô mai", "Socola", "Mứt dâu tây"],
    variants: [],
  },
  {
    name: "Strawberry Mousse",
    kind: "cake",
    category: "Bánh mousse",
    occasions: ["Sinh nhật"],
    description: "Bánh mousse dâu tây mềm mịn, kết hợp vị ngọt dịu và trái cây tươi.",
    basePrice: 450000,
    salePrice: null,
    status: "visible",
    featured: true,
    imageIds: [],
    availableSizes: ["10cm", "14cm", "18cm", "22cm"],
    availableFillings: ["Trái cây tươi"],
    variants: [],
  },
  {
    name: "Chocolate Truffle",
    kind: "cake",
    category: "Bánh mousse",
    occasions: ["Kỷ niệm"],
    description: "Bánh chocolate đậm vị, phủ lớp ganache mềm mượt.",
    basePrice: 520000,
    salePrice: null,
    status: "visible",
    featured: false,
    imageIds: [],
    availableSizes: ["10cm", "14cm", "18cm", "22cm"],
    availableFillings: ["Socola"],
    variants: [],
  },
  {
    name: "White Lace Wedding",
    kind: "cake",
    category: "Bánh bông lan",
    occasions: ["Tiệc cưới"],
    description: "Bánh cưới trang trí họa tiết ren trắng thanh lịch.",
    basePrice: 1200000,
    salePrice: null,
    status: "visible",
    featured: false,
    imageIds: [],
    availableSizes: ["18cm", "22cm"],
    availableFillings: ["Phô mai"],
    variants: [],
  },

  // =========================
  // PHỤ KIỆN
  // =========================
  {
    name: "Nến số",
    kind: "accessory",
    category: "Nến",
    occasions: ["Sinh nhật"],
    description: "Nến số dùng để trang trí bánh kem theo độ tuổi.",
    basePrice: 10000,
    salePrice: null,
    status: "visible",
    featured: false,
    imageIds: [],
    availableSizes: [],
    availableFillings: [],
    variants: [
      { label: "Số 0", attributes: { number: 0 }, active: true },
      { label: "Số 1", attributes: { number: 1 }, active: true },
      { label: "Số 2", attributes: { number: 2 }, active: true },
      { label: "Số 3", attributes: { number: 3 }, active: true },
    ],
  },
  {
    name: "Nến chữ",
    kind: "accessory",
    category: "Nến",
    occasions: ["Sinh nhật", "Kỷ niệm"],
    description: "Nến chữ trang trí bánh kem.",
    basePrice: 15000,
    salePrice: null,
    status: "visible",
    featured: false,
    imageIds: [],
    availableSizes: [],
    availableFillings: [],
    variants: [
      { label: "Happy Birthday", attributes: { text: "Happy Birthday" }, active: true },
      { label: "Love", attributes: { text: "Love" }, active: true },
    ],
  },
  {
    name: "Nón sinh nhật",
    kind: "accessory",
    category: "Phụ kiện trang trí",
    occasions: ["Sinh nhật"],
    description: "Nón sinh nhật trang trí tiệc.",
    basePrice: 20000,
    salePrice: null,
    status: "visible",
    featured: false,
    imageIds: [],
    availableSizes: [],
    availableFillings: [],
    variants: [
      { label: "Màu hồng", attributes: { color: "Hồng" }, active: true },
      { label: "Màu xanh", attributes: { color: "Xanh" }, active: true },
      { label: "Màu vàng", attributes: { color: "Vàng" }, active: true },
    ],
  },
];

// Các URL ảnh Unsplash
const imageUrlsByProduct = {
  "Bánh kem sinh nhật hoa tươi": [
    "https://plus.unsplash.com/premium_photo-1716918178842-d548932c80a7?q=80&w=1471&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D",
    "https://plus.unsplash.com/premium_photo-1717014573291-f26c91e2ca58?q=80&w=1422&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D",
  ],
  "Bánh kem socola": [
    "https://plus.unsplash.com/premium_photo-1687969682937-c62c7f32ed56?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D",
    "https://plus.unsplash.com/premium_photo-1687969682028-97e42a3c5539?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D",
  ],
  "Bánh kem trái cây": [
    "https://plus.unsplash.com/premium_photo-1664472680005-b9976125009d?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D",
    "https://plus.unsplash.com/premium_photo-1663133733226-809790756153?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D",
    "https://plus.unsplash.com/premium_photo-1663133720016-8c4766347a3e?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D",
  ],
  "Bánh mousse matcha": [
    "https://images.unsplash.com/photo-1736195676924-162ed0fac50b?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D",
  ],
  "Bánh Bento": [
    "https://images.unsplash.com/photo-1651307573144-a2e8df89bd6e?q=80&w=1548&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D",
  ],
  "Strawberry Mousse": [
    "https://plus.unsplash.com/premium_photo-1672192166785-bdf23cd39734?q=80&w=1548&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D",
    "https://plus.unsplash.com/premium_photo-1672192166439-f20d9ec1dbbc?q=80&w=1548&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D",
  ],
  "Chocolate Truffle": [
    "https://images.unsplash.com/photo-1605807646983-377bc5a76493?q=80&w=1448&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D",
  ],
  "White Lace Wedding": [
    "https://images.unsplash.com/photo-1629576690723-bb3a22ae7126?q=80&w=1554&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D",
    "https://images.unsplash.com/photo-1614878257906-91bdeb16c470?q=80&w=1574&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D",
  ],
};

async function seedProducts() {
  try {
    const operations = [];

    for (const product of defaultProducts) {
      const urls = imageUrlsByProduct[product.name] || [];
      const imageIds = [];

      // Validate URL nếu sản phẩm có cấu hình ảnh
      const invalidUrl = urls.find(
        (url) =>
          !url.startsWith("https://images.unsplash.com/") &&
          !url.startsWith("https://plus.unsplash.com/")
      );

      if (invalidUrl) {
        throw new Error(`URL ảnh không hợp lệ: ${invalidUrl}`);
      }

      for (let i = 0; i < urls.length; i++) {
        const media = await Media.findOneAndUpdate(
          { url: urls[i] },
          {
            $set: {
              alt: `${product.name} - ảnh ${i + 1}`,
              provider: "unsplash",
              sourceUrl: "https://unsplash.com/",
              isActive: true,
            },
          },
          {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true,
            runValidators: true,
          }
        );

        imageIds.push(media._id);
      }

      const {
        availableSizes,
        availableFillings,
        variants,
        imageIds: _defaultImageIds,
        ...insertFields
      } = product;

      const setFields = {
        availableSizes,
        availableFillings,
        variants,
      };

      if (imageIds.length > 0) {
        setFields.imageIds = imageIds;
      } else {
        insertFields.imageIds = [];
      }

      operations.push({
        updateOne: {
          filter: { name: product.name },
          update: {
            $setOnInsert: insertFields,
            $set: setFields,
          },
          upsert: true,
        },
      });
    }

    await Product.bulkWrite(operations);

    const totalProducts = await Product.countDocuments();
    const totalMedia = await Media.countDocuments();

    console.log("\n========== SEED PRODUCTS THÀNH CÔNG ==========");
    console.log(`Số sản phẩm mẫu đã kiểm tra: ${defaultProducts.length}`);
    console.log(`Tổng sản phẩm trong database: ${totalProducts}`);
    console.log(`Tổng Media trong database: ${totalMedia}`);
  } catch (error) {
    console.error("Lỗi khi seed Products:", error);
    throw error;
  }
}

module.exports = seedProducts;