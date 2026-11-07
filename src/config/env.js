require("dotenv").config();

const PORT = process.env.PORT || 5001;
const MONGODB_URI = process.env.MONGODB_URI;
const NODE_ENV = process.env.NODE_ENV || "development";

if (!MONGODB_URI) {
  throw new Error("MONGODB_URI is missing in .env file");
}

module.exports = {
  PORT,
  MONGODB_URI,
  NODE_ENV,
};