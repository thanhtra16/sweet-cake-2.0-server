const jwt = require("jsonwebtoken");
const {
  JWT_SECRET,
  JWT_EXPIRES_IN,
  TRACK_TOKEN_EXPIRES_IN,
} = require("../config/env");

const signToken = (user) =>
  jwt.sign({ id: user._id, role: user.role, type: "access" }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });

const verifyToken = (token) => {
  const payload = jwt.verify(token, JWT_SECRET);
  if (payload.type !== "access") throw new Error("Sai loại token");
  return payload;
};

const signTrackToken = (order) =>
  jwt.sign(
    { orderId: order._id, code: order.code, type: "track" },
    JWT_SECRET,
    { expiresIn: TRACK_TOKEN_EXPIRES_IN }
  );

const verifyTrackToken = (token) => {
  const payload = jwt.verify(token, JWT_SECRET);
  if (payload.type !== "track") throw new Error("Sai loại token");
  return payload;
};

module.exports = { signToken, verifyToken, signTrackToken, verifyTrackToken };