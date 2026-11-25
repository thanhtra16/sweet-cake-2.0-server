const mongoose = require("mongoose");
const Review = require("../../models/reviews");
const Product = require("../../models/products");

const sampleReviews = [
  { name: "Ngọc Anh", rating: 5, comment: "Bánh rất ngon, kem mềm mịn, trang trí đẹp đúng như mẫu." },
  { name: "Minh Khoa", rating: 4, comment: "Giao đúng giờ, bánh vừa ngọt. Sẽ ủng hộ tiếp." },
  { name: "Thu Hà", rating: 5, comment: "Cả nhà đều khen, nhân bánh thơm và không bị ngấy." },
  { name: "Quốc Bảo", rating: 3, comment: "Bánh ổn nhưng mình mong lớp kem mỏng hơn một chút." },
];

async function seedReviews() {
  const user = await mongoose.connection.collection("users").findOne({});
  if (!user) {
    console.log("Seed Reviews: bỏ qua vì chưa có user nào.");
    return;
  }

  const cakes = await Product.find({ kind: "cake", status: "visible" }).lean();

  for (const cake of cakes) {
    for (const sample of sampleReviews) {
      await Review.updateOne(
        { productId: cake._id, reviewerName: sample.name },
        {
          $setOnInsert: {
            userId: user._id,
            orderId: new mongoose.Types.ObjectId(), // orderId giả (chỉ dữ liệu demo)
            productId: cake._id,
            productName: cake.name,
            reviewerName: sample.name,
            rating: sample.rating,
            comment: sample.comment,
            status: "visible",
          },
        },
        { upsert: true }
      );
    }

    const [stats] = await Review.aggregate([
      { $match: { productId: cake._id, status: "visible" } },
      { $group: { _id: null, count: { $sum: 1 }, avg: { $avg: "$rating" } } },
    ]);

    await Product.updateOne(
      { _id: cake._id },
      {
        rating: stats ? Math.round(stats.avg * 10) / 10 : 0,
        reviewCount: stats?.count ?? 0,
      }
    );
  }

  console.log(`Seed Reviews thành công cho ${cakes.length} bánh.`);
}

module.exports = seedReviews;