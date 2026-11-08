require("dotenv").config();

const PORT = process.env.PORT || 5001;
const MONGODB_URI = process.env.MONGODB_URI;
const NODE_ENV = process.env.NODE_ENV || "development";
const TRACK_TOKEN_EXPIRES_IN = process.env.TRACK_TOKEN_EXPIRES_IN || "30d";

if (!MONGODB_URI) {
  throw new Error("MONGODB_URI is missing in .env file");
}

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is missing in .env file");
}

module.exports = {
  PORT,
  MONGODB_URI,
  NODE_ENV,
  JWT_SECRET, 
  JWT_EXPIRES_IN
};

