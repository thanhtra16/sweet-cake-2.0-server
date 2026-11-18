const FAQ = require("../../models/faqs");

const defaultFAQs = [
  {
    question: "SweetCake có nhận đặt bánh kem theo yêu cầu không?",
    answer:
      "Có. Khách hàng có thể tùy chỉnh bánh theo nhu cầu bằng cách lựa chọn kích thước, cốt bánh, nhân bánh, màu kem và độ ngọt. Ngoài ra, khách hàng có thể lựa chọn phụ kiện trang trí đi kèm nếu có.",
    order: 1,
    active: true,
  },
  {
    question: "Khách hàng có thể đặt bánh trước bao lâu?",
    answer:
      "Khách hàng có thể đặt bánh trước tối thiểu 24 giờ và tối đa 30 ngày so với thời điểm nhận bánh, tùy theo lịch nhận bánh còn khả dụng trên hệ thống.",
    order: 2,
    active: true,
  },
  {
    question: "SweetCake hiện hỗ trợ những hình thức nhận bánh nào?",
    answer:
      "Khách hàng có thể lựa chọn nhận bánh trực tiếp tại chi nhánh hoặc sử dụng dịch vụ giao hàng trong phạm vi TP.HCM theo các tùy chọn được cung cấp trên website.",
    order: 3,
    active: true,
  },
  {
    question: "Tôi có thể thay đổi thông tin đơn hàng sau khi đặt không?",
    answer:
      "Việc thay đổi thông tin đơn hàng phụ thuộc vào trạng thái xử lý đơn hàng và chính sách của cửa hàng. Khách hàng nên liên hệ SweetCake sớm để được hỗ trợ kiểm tra.",
    order: 4,
    active: true,
  },
  {
    question: "SweetCake hỗ trợ thanh toán bằng hình thức nào?",
    answer:
      "Khách hàng có thể thanh toán bằng hình thức chuyển khoản thông qua mã QR được cung cấp sau khi đặt hàng. Khách hàng cần hoàn tất thanh toán trong thời hạn hiển thị trên hệ thống.",
    order: 5,
    active: true,
  },
  {
    question: "Mã giảm giá được áp dụng như thế nào?",
    answer:
      "Khách hàng nhập mã giảm giá tại bước kiểm tra đơn hàng. Mã chỉ được áp dụng khi đơn hàng đáp ứng các điều kiện như thời hạn sử dụng, giá trị đơn hàng tối thiểu và giới hạn lượt sử dụng.",
    order: 6,
    active: true,
  },
  {
    question: "Tôi có thể sử dụng nhiều voucher cho một đơn hàng không?",
    answer:
      "Mỗi đơn hàng chỉ áp dụng một mã giảm giá. Nếu khách hàng chọn một mã khác, mã đã chọn trước đó sẽ được thay thế.",
    order: 7,
    active: true,
  },
  {
    question: "Tôi cần làm gì nếu chưa nhận được xác nhận thanh toán?",
    answer:
      "Khách hàng nên kiểm tra lại trạng thái đơn hàng và thông tin giao dịch. Nếu đã chuyển khoản nhưng hệ thống chưa cập nhật thanh toán, vui lòng liên hệ cửa hàng để được hỗ trợ kiểm tra.",
    order: 8,
    active: true,
  },
  {
    question: "Tôi có thể hủy đơn hàng sau khi đặt không?",
    answer:
      "Việc hủy đơn và hoàn tiền phụ thuộc vào trạng thái xử lý đơn hàng và chính sách hoàn tiền của SweetCake. Khách hàng vui lòng liên hệ cửa hàng để được hướng dẫn.",
    order: 9,
    active: true,
  },
  {
    question: "Làm thế nào để liên hệ SweetCake khi cần hỗ trợ?",
    answer:
      "Khách hàng có thể liên hệ SweetCake thông qua hotline hoặc các thông tin liên hệ được công bố trên website để được hỗ trợ về sản phẩm và đơn hàng.",
    order: 10,
    active: true,
  },
];

async function seedFAQs() {
  const operations = defaultFAQs.map((faq) => ({
    updateOne: {
      filter: {
        question: faq.question,
      },
      update: {
        $set: faq,
      },
      upsert: true,
    },
  }));

  try {
    await FAQ.bulkWrite(operations);
    console.log(
      `Seed FAQs thành công: đã kiểm tra ${defaultFAQs.length} câu hỏi thường gặp.`
    );
  } catch (error) {
    console.error(`Lỗi khi đồng bộ FAQs:`, error);
    throw error;
  }
}

module.exports = seedFAQs;