const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  kind: {
    type: String,
    enum: ["cake", "accessory"],
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  imageId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
  },
  basePrice: {
    type: Number,
    required: true,
    min: 0,
  },
  salePrice: {
    type: Number,
    default: null,
    min: 0,
  },
  config: {
    size: String,
    filling: String,
    base: String,
    frostingColor: String,
    sweetness: String,
    message: String,
  },
  variant: {
    type: String,
    default: null,
  },
  surcharges: {
    type: [Number],
    default: [],
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  qty: {
    type: Number,
    required: true,
    min: 1,
    max: 10,
  },
  lineTotal: {
    type: Number,
    required: true,
    min: 0,
  },
});

const statusHistorySchema = new mongoose.Schema({
  from: {
    type: String,
    default: null,
  },
  to: {
    type: String,
    required: true,
  },
  actor: {
    type: String,
    enum: ["customer", "admin", "system"],
    required: true,
  },
  time: {
    type: Date,
    default: Date.now,
  },
  reason: {
    type: String,
    default: "",
  },
});

const paymentAttemptSchema = new mongoose.Schema({
  qrCode: {
    type: String,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  deadlineAt: {
    type: Date,
    default: null,
  },
  result: {
    type: String,
    enum: ["pending", "success", "failed", "expired"],
    default: "pending",
  },
});

const voucherSnapshotSchema = new mongoose.Schema({
  code: String,
  type: {
    type: String,
    enum: ["percent", "amount"],
  },
  value: Number,
  discount: Number,
  restored: {
    type: Boolean,
    default: false,
  },
});

const orderSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    receiver: {
      fullName: {
        type: String,
        required: true,
      },
      phone: {
        type: String,
        required: true,
      },
    },

    receiveMethod: {
      type: String,
      enum: ["delivery", "pickup"],
      required: true,
    },

    shippingAddress: {
      recipientName: String,
      recipientPhone: String,
      province: String,
      district: String,
      detail: String,
    },

    pickupBranch: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    receiveDate: {
      type: Date,
      required: true,
    },

    slotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TimeSlot",
      required: true,
    },

    slotLabel: {
      type: String,
      required: true,
    },

    note: {
      type: String,
      maxlength: 200,
      default: "",
    },

    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: (items) => items.length > 0,
        message: "Đơn hàng phải có ít nhất một sản phẩm",
      },
    },

    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },

    discount: {
      type: Number,
      default: 0,
      min: 0,
    },

    deliveryFee: {
      type: Number,
      default: 0,
      min: 0,
    },

    total: {
      type: Number,
      required: true,
      min: 0,
    },

    voucher: {
      type: voucherSnapshotSchema,
      default: null,
    },

    status: {
      type: String,
      enum: [
        "pending_payment",
        "pending_approval",
        "accepted",
        "baking",
        "delivering",
        "delivered",
        "done",
        "cancelled",
      ],
      default: "pending_payment",
    },

    statusHistory: {
      type: [statusHistorySchema],
      default: [],
    },

    payment: {
      status: {
        type: String,
        enum: [
          "pending",
          "paid",
          "failed",
          "expired",
          "refunded",
        ],
        default: "pending",
      },
      attempts: {
        type: [paymentAttemptSchema],
        default: [],
      },
      slotHeld: {
        type: Boolean,
        default: false,
      },
      deadlineAt: {
        type: Date,
        default: null,
      },
      txnId: {
        type: String,
        default: null,
      },
      paidAt: {
        type: Date,
        default: null,
      },
      confirmedBy: {
        type: String,
        enum: ["webhook", "admin"],
        default: null,
      },
      latePayment: {
        type: Boolean,
        default: false,
      },
    },

    productionTicket: {
      createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
      createdAt: {
        type: Date,
        default: null,
      },
    },

    cancelRequest: {
      reasonCode: String,
      reason: String,
      requestedAt: Date,
      atStatus: String,
      status: {
        type: String,
        enum: ["pending", "accepted", "rejected"],
        default: null,
      },
      decidedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
      decidedAt: Date,
      decisionReason: String,
    },

    cancellation: {
      by: {
        type: String,
        enum: ["customer", "admin", "system"],
      },
      byUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
      reasonCode: String,
      reason: String,
      cause: {
        type: String,
        enum: ["shop_fault", "other"],
      },
      at: Date,
    },

    refund: {
      source: String,
      status: {
        type: String,
        enum: ["pending", "processed", "rejected", null],
        default: null,
      },
      suggestedAmount: {
        type: Number,
        default: 0,
      },
      amount: {
        type: Number,
        default: 0,
      },
      adjustReason: String,
      dueAt: Date,
      processedAt: Date,
      processedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
    },

    photoIds: {
      type: [mongoose.Schema.Types.ObjectId],
      default: [],
    },
  },
  {
    timestamps: true,
    collection: "orders",
  }
);

// Các index theo tài liệu
orderSchema.index({ code: 1 }, { unique: true });
orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ "receiver.phone": 1, code: 1 });
orderSchema.index({ status: 1, receiveDate: 1 });
orderSchema.index({ "cancelRequest.status": 1 });
orderSchema.index({ "refund.status": 1 });

// Một mã giao dịch chỉ được ghi nhận một lần.
// Chỉ áp dụng unique khi txnId có giá trị.
orderSchema.index(
  { "payment.txnId": 1 },
  {
    unique: true,
    partialFilterExpression: {
      "payment.txnId": { $type: "string" },
    },
  }
);

module.exports = mongoose.model("Order", orderSchema);