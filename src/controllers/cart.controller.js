const mongoose = require("mongoose");
const Cart = require("../models/carts");
const Product = require("../models/products"); // Đảm bảo đúng tên file model Product của dự án

const MAX_QTY_PER_LINE = 10;

/**
 * Chuẩn hóa object config bánh để so sánh trùng khớp tuyệt đối
 */
function normalizeConfig(config = {}) {
  if (!config || typeof config !== "object") return {};
  return {
    size: (config.size || "").trim(),
    filling: (config.filling || "").trim(),
    base: (config.base || "").trim(),
    frostingColor: (config.frostingColor || "").trim(),
    sweetness: (config.sweetness || "").trim(),
    message: (config.message || "").trim(),
  };
}

/**
 * So sánh 2 dòng giỏ hàng có cùng sản phẩm & cùng cấu hình/biến thể hay không (BR11)
 */
function isSameLineItem(existingItem, incoming) {
  if (existingItem.productId.toString() !== incoming.productId.toString()) {
    return false;
  }
  if (existingItem.kind !== incoming.kind) {
    return false;
  }
  if (incoming.kind === "accessory") {
    return (existingItem.variant || null) === (incoming.variant || null);
  }
  const a = normalizeConfig(existingItem.config);
  const b = normalizeConfig(incoming.config);
  return (
    a.size === b.size &&
    a.filling === b.filling &&
    a.base === b.base &&
    a.frostingColor === b.frostingColor &&
    a.sweetness === b.sweetness &&
    a.message === b.message
  );
}

/**
 * Lấy thông tin sản phẩm từ DB & tính đơn giá (unitPrice) chuẩn xác từ server
 * Tránh client tự sửa giá dưới Frontend
 */
async function buildValidatedCartItem(payload) {
  const { productId, kind, config, variant, surcharges = 0, qty = 1 } = payload;

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw { status: 400, message: "Mã sản phẩm không hợp lệ." };
  }

  const product = await Product.findById(productId).lean();
  if (!product) {
    throw { status: 404, message: "Sản phẩm không tồn tại." };
  }
  if (product.status === "hidden" || product.isDeleted) {
    throw { status: 400, message: `Sản phẩm "${product.name}" hiện đã ngừng kinh doanh.` };
  }

  const parsedQty = Math.max(1, Math.min(MAX_QTY_PER_LINE, Number(qty) || 1));
  const parsedSurcharges = Math.max(0, Number(surcharges) || 0);
  const basePrice = Number(product.basePrice ?? product.price ?? 0);
  const salePrice = product.salePrice != null ? Number(product.salePrice) : null;
  const effectiveBase = salePrice !== null && salePrice < basePrice ? salePrice : basePrice;
  const unitPrice = effectiveBase + parsedSurcharges;

  const resolvedKind = kind || product.kind || "cake";
  const imageId =
    Array.isArray(product.imageIds) && product.imageIds.length > 0
      ? product.imageIds[0]
      : null;

  return {
    productId: product._id,
    kind: resolvedKind,
    name: product.name,
    imageId,
    basePrice,
    salePrice,
    config: resolvedKind === "cake" ? normalizeConfig(config) : {},
    variant: resolvedKind === "accessory" ? variant || null : null,
    surcharges: parsedSurcharges,
    unitPrice,
    qty: parsedQty,
  };
}

/**
 * [GET] /api/cart
 * Lấy giỏ hàng hiện tại của Buyer (kèm kiểm tra trạng thái ngừng bán / cập nhật giá mới nhất)
 */
exports.getCart = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    let cart = await Cart.findOne({ userId });

    if (!cart) {
      cart = await Cart.create({ userId, items: [] });
    }

    // Đối chiếu giá & trạng thái sản phẩm mới nhất từ collection products (UC-KH-16)
    const productIds = cart.items.map((item) => item.productId);
    const products = await Product.find({ _id: { $in: productIds } }).lean();
    const productMap = new Map(products.map((p) => [p._id.toString(), p]));

    let hasPriceUpdate = false;
    const enrichedItems = cart.items.map((item) => {
      const obj = item.toObject();
      const prod = productMap.get(item.productId.toString());

      if (!prod || prod.status === "hidden" || prod.isDeleted) {
        return { ...obj, isUnavailable: true, unavailableReason: "Ngừng kinh doanh" };
      }

      const latestBase = Number(prod.basePrice ?? prod.price ?? 0);
      const latestSale = prod.salePrice != null ? Number(prod.salePrice) : null;
      const effective = latestSale !== null && latestSale < latestBase ? latestSale : latestBase;
      const latestUnit = effective + (item.surcharges || 0);

      if (latestUnit !== item.unitPrice) {
        item.basePrice = latestBase;
        item.salePrice = latestSale;
        item.unitPrice = latestUnit;
        hasPriceUpdate = true;
      }

      return { ...item.toObject(), isUnavailable: false };
    });

    if (hasPriceUpdate) {
      await cart.save();
    }

    return res.status(200).json({
      userId: cart.userId,
      items: enrichedItems,
      updatedAt: cart.updatedAt,
    });
  } catch (err) {
    return res.status(err.status || 500).json({
      message: err.message || "Lỗi máy chủ khi tải giỏ hàng.",
    });
  }
};

/**
 * [POST] /api/cart/items
 * Thêm sản phẩm vào giỏ hàng Buyer (Gộp dòng nếu trùng cấu hình, tối đa 10/dòng - BR11)
 */
exports.addItem = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const validatedItem = await buildValidatedCartItem(req.body);

    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = new Cart({ userId, items: [] });
    }

    const existingIndex = cart.items.findIndex((item) =>
      isSameLineItem(item, validatedItem)
    );

    if (existingIndex > -1) {
      const currentQty = cart.items[existingIndex].qty;
      const newQty = currentQty + validatedItem.qty;

      if (newQty > MAX_QTY_PER_LINE) {
        return res.status(400).json({
          message: `Mỗi dòng sản phẩm chỉ được đặt tối đa ${MAX_QTY_PER_LINE} chiếc (hiện đã có ${currentQty} trong giỏ).`,
        });
      }

      cart.items[existingIndex].qty = newQty;
      cart.items[existingIndex].unitPrice = validatedItem.unitPrice;
      cart.items[existingIndex].basePrice = validatedItem.basePrice;
      cart.items[existingIndex].salePrice = validatedItem.salePrice;
    } else {
      cart.items.push(validatedItem);
    }

    await cart.save();
    return res.status(200).json({
      message: "Đã thêm sản phẩm vào giỏ hàng.",
      items: cart.items,
    });
  } catch (err) {
    return res.status(err.status || 500).json({
      message: err.message || "Không thể thêm sản phẩm vào giỏ hàng.",
    });
  }
};

/**
 * [PATCH] /api/cart/items/:itemId
 * Cập nhật số lượng của một dòng trong giỏ hàng (UC-KH-17)
 */
exports.updateItemQty = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { itemId } = req.params;
    const qty = Number(req.body.qty);

    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY_PER_LINE) {
      return res.status(400).json({
        message: `Số lượng mỗi dòng phải từ 1 đến ${MAX_QTY_PER_LINE}.`,
      });
    }

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(404).json({ message: "Không tìm thấy giỏ hàng." });
    }

    const item = cart.items.id(itemId);
    if (!item) {
      return res.status(404).json({ message: "Dòng sản phẩm không tồn tại trong giỏ." });
    }

    item.qty = qty;
    await cart.save();

    return res.status(200).json({
      message: "Đã cập nhật số lượng.",
      items: cart.items,
    });
  } catch (err) {
    return res.status(500).json({ message: "Lỗi khi cập nhật số lượng giỏ hàng." });
  }
};

/**
 * [DELETE] /api/cart/items/:itemId
 * Xóa một dòng khỏi giỏ hàng (UC-KH-18)
 */
exports.removeItem = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { itemId } = req.params;

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(404).json({ message: "Không tìm thấy giỏ hàng." });
    }

    const item = cart.items.id(itemId);
    if (!item) {
      return res.status(404).json({ message: "Dòng sản phẩm không tồn tại." });
    }

    item.deleteOne();
    await cart.save();

    return res.status(200).json({
      message: "Đã xóa sản phẩm khỏi giỏ hàng.",
      items: cart.items,
    });
  } catch (err) {
    return res.status(500).json({ message: "Lỗi khi xóa sản phẩm khỏi giỏ hàng." });
  }
};

/**
 * [POST] /api/cart/items/bulk-remove
 * Xóa danh sách các dòng sản phẩm đã đặt hàng thành công (sau POST /api/orders)
 */
exports.removeOrderedItems = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { itemIds } = req.body;

    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      return res.status(400).json({ message: "Danh sách itemIds không hợp lệ." });
    }

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(200).json({ items: [] });
    }

    const idSet = new Set(itemIds.map(String));
    cart.items = cart.items.filter((item) => !idSet.has(item._id.toString()));
    await cart.save();

    return res.status(200).json({
      message: "Đã dọn dẹp các sản phẩm đã đặt khỏi giỏ hàng.",
      items: cart.items,
    });
  } catch (err) {
    return res.status(500).json({ message: "Lỗi khi xóa các dòng đã đặt." });
  }
};

/**
 * [POST] /api/cart/merge
 * Gộp giỏ hàng Guest (từ localStorage) vào giỏ Buyer trên DB ngay khi đăng nhập (UC-KH-02)
 */
exports.mergeGuestCart = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const guestItems = Array.isArray(req.body.items) ? req.body.items : [];

    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = new Cart({ userId, items: [] });
    }

    const warnings = [];

    for (const rawGuestItem of guestItems) {
      try {
        const validated = await buildValidatedCartItem(rawGuestItem);
        const existingIndex = cart.items.findIndex((item) =>
          isSameLineItem(item, validated)
        );

        if (existingIndex > -1) {
          const combined = cart.items[existingIndex].qty + validated.qty;
          if (combined > MAX_QTY_PER_LINE) {
            cart.items[existingIndex].qty = MAX_QTY_PER_LINE;
            warnings.push(
              `Sản phẩm "${validated.name}" đã được điều chỉnh về mức tối đa ${MAX_QTY_PER_LINE} chiếc.`
            );
          } else {
            cart.items[existingIndex].qty = combined;
          }
          cart.items[existingIndex].unitPrice = validated.unitPrice;
        } else {
          cart.items.push(validated);
        }
      } catch (itemErr) {
        // Bỏ qua món đã ngừng bán hoặc lỗi dữ liệu khi gộp, báo cảnh báo cho user
        warnings.push(itemErr.message || "Một sản phẩm trong giỏ tạm không còn khả dụng.");
      }
    }

    await cart.save();

    return res.status(200).json({
      message: "Đồng bộ giỏ hàng thành công.",
      items: cart.items,
      warnings,
    });
  } catch (err) {
    return res.status(500).json({ message: "Lỗi máy chủ khi đồng bộ giỏ hàng." });
  }
};