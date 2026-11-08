const Product = require("../../models/products");

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
    availableSizes: ["18cm", "20cm", "22cm"],
    availableFillings: ["Bắp", "Matcha", "Phô mai", "Trái cây tươi", "Socola"],
    variants: [],
  },
  {
    name: "Bánh kem socola",
    kind: "cake",
    category: "Bánh sinh nhật",
    occasions: ["Sinh nhật", "Kỷ niệm"],
    description: "Bánh kem vị socola với lớp kem mềm mịn, thích hợp cho người yêu thích socola.",
    basePrice: 320000,
    salePrice: null,
    status: "visible",
    featured: true,
    imageIds: [],
    availableSizes: ["18cm", "20cm", "22cm"],
    availableFillings: ["Socola", "Phô mai", "Bắp"],
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
    availableSizes: ["18cm", "20cm", "22cm"],
    availableFillings: ["Trái cây tươi", "Bắp", "Phô mai"],
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
    availableSizes: ["18cm", "20cm", "22cm"],
    availableFillings: ["Matcha", "Phô mai"],
    variants: [],
  },
  {
    name: "Bánh Bento",
    kind: "cake",
    category: "Bánh Bento",
    occasions: ["Sinh nhật", "Kỷ niệm", "Chúc mừng"],
    description: "Bánh kem Bento kích thước nhỏ, phù hợp cho những dịp đặc biệt đơn giản.",
    basePrice: 150000,
    salePrice: null,
    status: "visible",
    featured: false,
    imageIds: [],
    availableSizes: ["18cm"],
    availableFillings: ["Bắp", "Matcha", "Phô mai", "Socola"],
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
      {
        label: "Số 0",
        attributes: { number: 0 },
        active: true,
      },
      {
        label: "Số 1",
        attributes: { number: 1 },
        active: true,
      },
      {
        label: "Số 2",
        attributes: { number: 2 },
        active: true,
      },
      {
        label: "Số 3",
        attributes: { number: 3 },
        active: true,
      },
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
      {
        label: "Happy Birthday",
        attributes: { text: "Happy Birthday" },
        active: true,
      },
      {
        label: "Love",
        attributes: { text: "Love" },
        active: true,
      },
    ],
  },
  {
    name: "Nón sinh nhật",
    kind: "accessory",
    category: "Phụ kiện trang trí",
    occasions: ["Sinh nhật"],
    description: "Nón sinh nhật dùng để trang trí và tạo điểm nhấn cho bánh kem.",
    basePrice: 20000,
    salePrice: null,
    status: "visible",
    featured: false,
    imageIds: [],
    availableSizes: [],
    availableFillings: [],
    variants: [],
  },
  {
    name: "Pháo sinh nhật",
    kind: "accessory",
    category: "Phụ kiện trang trí",
    occasions: ["Sinh nhật", "Chúc mừng"],
    description: "Phụ kiện pháo trang trí dùng trong các buổi tiệc sinh nhật.",
    basePrice: 25000,
    salePrice: null,
    status: "visible",
    featured: false,
    imageIds: [],
    availableSizes: [],
    availableFillings: [],
    variants: [],
  },
  {
    name: "Bình xịt trang trí",
    kind: "accessory",
    category: "Phụ kiện trang trí",
    occasions: ["Sinh nhật", "Kỷ niệm"],
    description: "Bình xịt trang trí dùng trong các dịp tổ chức tiệc.",
    basePrice: 30000,
    salePrice: null,
    status: "visible",
    featured: false,
    imageIds: [],
    availableSizes: [],
    availableFillings: [],
    variants: [],
  },
  {
    name: "Bong bóng",
    kind: "accessory",
    category: "Phụ kiện trang trí",
    occasions: ["Sinh nhật", "Kỷ niệm", "Chúc mừng"],
    description: "Bong bóng trang trí đi kèm bánh kem.",
    basePrice: 20000,
    salePrice: null,
    status: "visible",
    featured: false,
    imageIds: [],
    availableSizes: [],
    availableFillings: [],
    variants: [
      {
        label: "Màu hồng",
        attributes: { color: "Hồng" },
        active: true,
      },
      {
        label: "Màu xanh",
        attributes: { color: "Xanh" },
        active: true,
      },
      {
        label: "Màu vàng",
        attributes: { color: "Vàng" },
        active: true,
      },
    ],
  },
];

async function seedProducts() {
  const operations = defaultProducts.map((product) => ({
    updateOne: {
      filter: {
        name: product.name,
        kind: product.kind,
      },
      update: {
        $setOnInsert: product,
      },
      upsert: true,
    },
  }));

  await Product.bulkWrite(operations);

  const total = await Product.countDocuments();

  console.log(
    `Seed Products thành công: đã kiểm tra ${defaultProducts.length} sản phẩm mẫu.`
  );
  console.log(`Tổng số sản phẩm hiện có: ${total}`);
}

module.exports = seedProducts;