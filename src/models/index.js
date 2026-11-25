// File tạm thời Kiểm tra Model có kết nối được với MongoDB không
const User = require("./users");
const Product = require("./products");
const Cart = require("./carts");
const Customization = require("./customizations");
const TimeSlot = require("./timeslots");
const Setting = require("./settings");
const Voucher = require("./vouchers");
const Order = require("./order");
const Review = require("./reviews");
const Notification = require("./notifications");
const Post = require("./posts");
const FAQ = require("./faqs");
const CustomRequest = require("./customrequests");
const OTPCode = require("./OTPCode");

module.exports = {
  User,
  Product,
  Cart,
  Customization,
  TimeSlot,
  Setting,
  Voucher,
  Order,
  Review,
  Notification,
  Post,
  FAQ,
  CustomRequest,
  OTPCode,
};