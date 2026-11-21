const mongoose = require("mongoose");
const { GridFSBucket } = require("mongodb");

let bucket = null;

const initGridFS = () => {
  if (mongoose.connection.readyState !== 1) {
    throw new Error("MongoDB chưa được kết nối");
  }

  if (!bucket) {
    bucket = new GridFSBucket(mongoose.connection.db, {
      bucketName: "images",
    });

    console.log("GridFS initialized successfully!");
  }

  return bucket;
};

const getGridFSBucket = () => {
  if (!bucket) {
    return initGridFS();
  }

  return bucket;
};

module.exports = {
  initGridFS,
  getGridFSBucket,
};
