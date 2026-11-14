const Post = require("../../models/posts");

const defaultPosts = [
  {
    title: "Bí quyết chọn bánh kem phù hợp cho từng dịp đặc biệt",
    slug: "bi-quyet-chon-banh-kem-phu-hop-cho-tung-dip",
    excerpt:
      "Khám phá cách lựa chọn bánh kem phù hợp với sinh nhật, kỷ niệm và những dịp chúc mừng đặc biệt.",
    content: `
      <h2>Chọn bánh kem theo từng dịp</h2>
      <p>Bánh kem không chỉ là món tráng miệng mà còn góp phần tạo nên không khí cho những dịp đặc biệt.</p>

      <h3>Bánh kem sinh nhật</h3>
      <p>Đối với tiệc sinh nhật, bạn có thể lựa chọn bánh kem theo sở thích, độ tuổi và phong cách của người nhận.</p>

      <h3>Bánh kem kỷ niệm</h3>
      <p>Những mẫu bánh có thiết kế tinh tế, màu sắc nhẹ nhàng sẽ phù hợp với các dịp kỷ niệm.</p>

      <h3>Bánh kem chúc mừng</h3>
      <p>Bạn có thể lựa chọn bánh theo chủ đề và thông điệp muốn gửi gắm.</p>
    `,
    imageId: null,
    tags: ["Chọn bánh", "Bánh kem", "Kinh nghiệm"],
    status: "published",
    publishedAt: new Date(),
  },
  {
    title: "Cách bảo quản bánh kem đúng cách để giữ hương vị thơm ngon",
    slug: "cach-bao-quan-banh-kem-dung-cach",
    excerpt:
      "Một số lưu ý khi bảo quản bánh kem giúp duy trì chất lượng và hương vị sau khi mua.",
    content: `
      <h2>Bảo quản bánh kem trong tủ lạnh</h2>
      <p>Bánh kem nên được bảo quản trong ngăn mát tủ lạnh và đặt trong hộp kín để hạn chế ảnh hưởng từ môi trường bên ngoài.</p>

      <h2>Hạn chế để bánh ở nhiệt độ phòng quá lâu</h2>
      <p>Kem và các thành phần trang trí có thể bị ảnh hưởng khi tiếp xúc với nhiệt độ cao trong thời gian dài.</p>

      <h2>Sử dụng bánh trong thời gian phù hợp</h2>
      <p>Nên ưu tiên sử dụng bánh sớm và tham khảo hướng dẫn bảo quản cụ thể từ cửa hàng.</p>
    `,
    imageId: null,
    tags: ["Bảo quản", "Bánh kem", "Mẹo hay"],
    status: "published",
    publishedAt: new Date(),
  },
  {
    title: "Khám phá các loại nhân bánh kem được yêu thích",
    slug: "kham-pha-cac-loai-nhan-banh-kem-duoc-yeu-thich",
    excerpt:
      "Tìm hiểu những lựa chọn nhân bánh phổ biến để tạo nên chiếc bánh phù hợp với sở thích của bạn.",
    content: `
      <h2>Nhân bắp</h2>
      <p>Nhân bắp mang đến vị ngọt nhẹ và hương thơm đặc trưng.</p>

      <h2>Nhân matcha</h2>
      <p>Matcha phù hợp với những người yêu thích hương vị trà xanh.</p>

      <h2>Nhân phô mai</h2>
      <p>Phô mai tạo cảm giác béo ngậy và hương vị đậm đà.</p>

      <h2>Nhân trái cây tươi</h2>
      <p>Trái cây tươi mang đến vị thanh nhẹ, kết hợp hài hòa với lớp kem.</p>

      <h2>Nhân socola</h2>
      <p>Socola là lựa chọn quen thuộc dành cho những người yêu thích vị ngọt đậm.</p>
    `,
    imageId: null,
    tags: ["Nhân bánh", "Matcha", "Socola", "Trái cây"],
    status: "published",
    publishedAt: new Date(),
  },
  {
    title: "Bánh Bento – Món quà nhỏ dành cho những dịp đặc biệt",
    slug: "banh-bento-mon-qua-nho-cho-dip-dac-biet",
    excerpt:
      "Bánh Bento có kích thước nhỏ gọn, thiết kế đơn giản và phù hợp với những buổi kỷ niệm thân mật.",
    content: `
      <h2>Bánh Bento là gì?</h2>
      <p>Bánh Bento là dòng bánh kem có kích thước nhỏ, thường được trang trí theo phong cách tối giản.</p>

      <h2>Phù hợp với những dịp nào?</h2>
      <p>Bánh Bento có thể dùng trong sinh nhật cá nhân, kỷ niệm hoặc làm món quà nhỏ dành tặng người thân.</p>

      <h2>Cá nhân hóa chiếc bánh</h2>
      <p>Bạn có thể lựa chọn màu sắc, nội dung trang trí và hương vị theo sở thích.</p>
    `,
    imageId: null,
    tags: ["Bánh Bento", "Xu hướng", "Quà tặng"],
    status: "published",
    publishedAt: new Date(),
  },
  {
    title: "Hướng dẫn đặt bánh kem theo yêu cầu tại SweetCake",
    slug: "huong-dan-dat-banh-kem-theo-yeu-cau-tai-sweetcake",
    excerpt:
      "Các bước lựa chọn sản phẩm, tùy chỉnh bánh và hoàn tất đơn hàng trên website SweetCake.",
    content: `
      <h2>Bước 1: Chọn mẫu bánh</h2>
      <p>Truy cập danh sách sản phẩm và lựa chọn mẫu bánh phù hợp với nhu cầu.</p>

      <h2>Bước 2: Tùy chỉnh bánh</h2>
      <p>Lựa chọn kích thước, loại nhân, cốt bánh, màu kem và độ ngọt theo mong muốn.</p>

      <h2>Bước 3: Chọn phụ kiện và thời gian nhận bánh</h2>
      <p>Bạn có thể lựa chọn phụ kiện đi kèm, sau đó chọn thời gian nhận bánh phù hợp với lịch khả dụng.</p>

      <h2>Bước 4: Kiểm tra và đặt hàng</h2>
      <p>Kiểm tra thông tin đơn hàng, áp dụng voucher nếu có và thực hiện thanh toán theo hướng dẫn.</p>
    `,
    imageId: null,
    tags: ["Hướng dẫn", "Đặt bánh", "SweetCake"],
    status: "published",
    publishedAt: new Date(),
  },
];

async function seedPosts() {
  const operations = defaultPosts.map((post) => ({
    updateOne: {
      filter: { slug: post.slug },
      update: {
        $set: post,
      },
      upsert: true,
    },
  }));

  try {
    await Post.bulkWrite(operations);
    console.log(
      `Seed Posts thành công: đã kiểm tra ${defaultPosts.length} bài viết mẫu.`
    );
  } catch (error) {
    console.error(`Lỗi khi đồng bộ Posts:`, error);
    throw error;
  }
}

module.exports = seedPosts;