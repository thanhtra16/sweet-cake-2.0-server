const mongoose = require("mongoose");
const Product = require("../../models/products");
const { getGridFSBucket } = require("../../config/gridfs");

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
    availableSizes: ["10cm", "14cm", "18cm", "22cm"],
    availableFillings: ["Bắp", "Matcha", "Phô mai", "Trái cây tươi", "Socola", "Mứt dâu tây"],
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
    availableSizes: ["10cm", "14cm", "18cm", "22cm"],
    availableFillings: ["Socola", "Phô mai", "Bắp", "Mứt dâu tây"],
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
    availableSizes: ["10cm", "14cm", "18cm", "22cm"],
    availableFillings: ["Trái cây tươi", "Bắp", "Phô mai", "Mứt dâu tây"],
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
    availableSizes: ["10cm", "14cm", "18cm", "22cm"],
    availableFillings: ["Matcha", "Phô mai", "Mứt dâu tây"],
  },
  {
    name: "Bánh Bento",
    kind: "cake",
    category: "Bánh Bento",
    occasions: ["Sinh nhật", "Kỷ niệm", "Chúc mừng"],
    description: "Bánh kem Bento kích thước nhỏ, phù hợp cho những dịp đặc biệt.",
    basePrice: 150000,
    featured: false,
    availableSizes: ["10cm"],
    availableFillings: ["Bắp", "Matcha", "Phô mai", "Socola", "Mứt dâu tây"],
  },
  {
    name: "Strawberry Mousse",
    kind: "cake",
    category: "Bánh mousse",
    occasions: ["Sinh nhật"],
    description: "Bánh mousse dâu tây mềm mịn, kết hợp vị ngọt dịu và trái cây tươi.",
    basePrice: 450000,
    featured: true,
    availableSizes: ["10cm", "14cm", "18cm", "22cm"],
    availableFillings: ["Trái cây tươi"],
  },
  {
    name: "Chocolate Truffle",
    kind: "cake",
    category: "Bánh mousse",
    occasions: ["Kỷ niệm"],
    description: "Bánh chocolate đậm vị, phủ lớp ganache mềm mượt.",
    basePrice: 520000,
    featured: false,
    availableSizes: ["10cm", "14cm", "18cm", "22cm"],
    availableFillings: ["Socola"],
  },
  {
    name: "White Lace Wedding",
    kind: "cake",
    category: "Bánh bông lan",
    occasions: ["Tiệc cưới"],
    description: "Bánh cưới trang trí họa tiết ren trắng thanh lịch.",
    basePrice: 1200000,
    featured: false,
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
      { label: "Số 4", attributes: { number: 4 }, active: true },
      { label: "Số 5", attributes: { number: 5 }, active: true },
      { label: "Số 6", attributes: { number: 6 }, active: true },
      { label: "Số 7", attributes: { number: 7 }, active: true },
      { label: "Số 8", attributes: { number: 8 }, active: true },
      { label: "Số 9", attributes: { number: 9 }, active: true },
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

// Các URL ảnh Unsplash (mỗi sản phẩm là một mảng URL).
// Tên key phải trùng chính xác với "name" trong defaultProducts.
// Sản phẩm nào không có ở đây sẽ được bỏ qua phần ảnh.
const imageUrlsByProduct = {
  "Bánh kem sinh nhật hoa tươi": [
    "https://plus.unsplash.com/premium_photo-1716918178842-d548932c80a7?q=80&w=1471&auto=format&fit=crop",
    // Thêm URL khác của sản phẩm này tại đây
  ],
  // "Bánh kem socola": ["https://..."],
  // "Bánh kem trái cây": ["https://..."],
  // "Bánh mousse matcha": ["https://..."],
  // "Bánh Bento": ["https://..."],
  // "Strawberry Mousse": ["https://..."],
  // "Chocolate Truffle": ["https://..."],
  // "White Lace Wedding": ["https://..."],
};

// Tải ảnh từ URL và upload vào GridFS (purpose = "product")
async function uploadImageFromUrl(url, productId, filename) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.startsWith("image/")) {
    throw new Error(`Không phải ảnh (${contentType})`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const bucket = getGridFSBucket();
  const imageId = new mongoose.Types.ObjectId();

  await new Promise((resolve, reject) => {
    const stream = bucket.openUploadStreamWithId(imageId, filename, {
      contentType,
      metadata: {
        purpose: "product",
        targetId: productId,
        uploadedAt: new Date(),
      },
    });
    stream.on("error", reject);
    stream.on("finish", resolve);
    stream.end(buffer);
  });

  return imageId;
}

async function seedProductImages() {
  for (const [name, urls] of Object.entries(imageUrlsByProduct)) {
    const product = await Product.findOne({ name });

    if (!product) {
      console.warn(`Bỏ qua ảnh: không tìm thấy sản phẩm "${name}"`);
      continue;
    }

    // Đã có ảnh (seed trước đó hoặc Admin upload) thì không tải lại
    if (product.imageIds.length > 0) {
      continue;
    }

    const newIds = [];

    for (const [index, url] of urls.entries()) {
      try {
        const id = await uploadImageFromUrl(
          url,
          product._id,
          `${name}-${index + 1}.jpg`
        );
        newIds.push(id);
      } catch (error) {
        console.warn(
          `Không tải được ảnh ${index + 1} của "${name}": ${error.message}`
        );
      }
    }

    if (newIds.length > 0) {
      await Product.updateOne(
        { _id: product._id },
        { $addToSet: { imageIds: { $each: newIds } } }
      );
      console.log(`Đã gắn ${newIds.length} ảnh cho "${name}"`);
    }
  }
}

async function seedProducts() {
  const operations = defaultProducts.map((product) => {
    const {
      availableSizes,
      availableFillings,
      variants,
      ...insertFields
    } = product;

    return {
      updateOne: {
        filter: { name: product.name },
        update: {
          // Chỉ ghi các trường này khi tạo sản phẩm mới.
          // Không ghi đè imageIds đã được Admin upload.
          $setOnInsert: insertFields,

          // Đồng bộ dữ liệu cấu hình từ file seed khi chạy lại.
          $set: {
            availableSizes,
            availableFillings,
            variants,
          },
        },
        upsert: true,
      },
    };
  });

  try {
    await Product.bulkWrite(operations);
    await seedProductImages();

    const total = await Product.countDocuments();
    console.log(
      `Seed Products thành công: đã kiểm tra ${defaultProducts.length} sản phẩm mẫu.`
    );
    console.log(`Tổng số sản phẩm hiện có: ${total}`);
  } catch (error) {
    console.error("Lỗi khi đồng bộ Products:", error);
    throw error;
  }
}

module.exports = seedProducts;
