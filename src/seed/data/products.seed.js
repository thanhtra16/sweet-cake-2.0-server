
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
    description:
      "Bánh kem trang trí hoa tươi, phù hợp cho các dịp sinh nhật và kỷ niệm.",
    basePrice: 350000,
    salePrice: null,
    status: "visible",
    featured: true,
    availableSizes: ["10cm", "14cm", "18cm", "22cm"],
    availableFillings: [
      "Bắp",
      "Matcha",
      "Phô mai",
      "Trái cây tươi",
      "Socola",
      "Mứt dâu tây",
    ],
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
    description:
      "Bánh kem Bento kích thước nhỏ, phù hợp cho những dịp đặc biệt.",
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
    description:
      "Bánh mousse dâu tây mềm mịn, kết hợp vị ngọt dịu và trái cây tươi.",
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
      {
        label: "Happy Birthday",
        attributes: { text: "Happy Birthday" },
        active: true,
      },
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

{
  name: "Pháo sinh nhật",
  kind: "accessory",
  category: "Phụ kiện trang trí",
  occasions: ["Sinh nhật"],
  description: "Pháo trang trí dùng trong tiệc sinh nhật.",
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
  occasions: ["Sinh nhật"],
  description: "Bình xịt trang trí dùng cho bánh kem và tiệc sinh nhật.",
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
  occasions: ["Sinh nhật"],
  description: "Bong bóng trang trí tiệc sinh nhật.",
  basePrice: 20000,
  salePrice: null,
  status: "visible",
  featured: false,
  imageIds: [],
  availableSizes: [],
  availableFillings: [],
  variants: [],
},
];

// =========================
// URL ẢNH SẢN PHẨM
// =========================
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

  "Nến số": [
    "https://plus.unsplash.com/premium_photo-1697898006742-1b8f624e779e?q=80&w=987&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D",
  ],

  "Nến chữ": [
    "https://images.unsplash.com/photo-1729870526122-0de9a7113dc6?q=80&w=1558&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D",
  ],

  "Nón sinh nhật": [
    "https://images.unsplash.com/photo-1759124650162-6bc71d025621?q=80&w=1469&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D",
  ],
   "Pháo sinh nhật": [
   "https://images.unsplash.com/photo-1502035618526-6b2f1f5bca1b?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D",
 ],
 "Bình xịt trang trí": [
   "https://images.unsplash.com/photo-1618143511698-c2ebcdabb11d?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D",
 ],
 "Bong bóng": [
   "https://plus.unsplash.com/premium_photo-1663837827386-2eb667eca095?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D",
 ],

};

// =========================
// TẢI ẢNH VÀ LƯU GRIDFS
// =========================
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

// =========================
// CẬP NHẬT ẢNH SẢN PHẨM
// =========================
async function seedProductImages() {
  for (const [name, urls] of Object.entries(imageUrlsByProduct)) {
    const product = await Product.findOne({ name });

    if (!product) {
      console.warn(`Bỏ qua ảnh: không tìm thấy sản phẩm "${name}"`);
      continue;
    }

    const newIds = [];

    for (const [index, url] of urls.entries()) {
      try {
        const id = await uploadImageFromUrl(
          url,
          product._id,
          `${name}-${index + 1}.jpg`,
        );

        newIds.push(id);
        console.log(`Đã tải ảnh ${index + 1} cho "${name}"`);
      } catch (error) {
        console.warn(
          `Không tải được ảnh ${index + 1} của "${name}": ${error.message}`,
        );
      }
    }

    // Chỉ cập nhật khi tải được ít nhất một ảnh mới.
    // Nếu tất cả URL lỗi thì giữ nguyên ảnh cũ.
    if (newIds.length > 0) {
      await Product.updateOne(
        { _id: product._id },
        { $set: { imageIds: newIds } },
      );

      console.log(`Đã cập nhật ${newIds.length} ảnh mới cho "${name}"`);
    } else {
      console.warn(`Giữ nguyên ảnh cũ của "${name}"`);
    }
  }
}

// =========================
// SEED SẢN PHẨM
// =========================
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
          $setOnInsert: insertFields,
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
      `Seed Products thành công: đã kiểm tra ${defaultProducts.length} sản phẩm mẫu.`,
    );
    console.log(`Tổng số sản phẩm hiện có: ${total}`);
  } catch (error) {
    console.error("Lỗi khi đồng bộ Products:", error);
    throw error;
  }
}

module.exports = seedProducts;
