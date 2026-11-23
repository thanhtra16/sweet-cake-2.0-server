const express = require("express");
const router = express.Router();

const {
  getAdminCustomization,
  updateAdminCustomization,
} = require("../controllers/adminCustomization.controller");

const { auth, requireRole } = require("../middlewares/auth");

router.use(auth, requireRole("admin"));

router.get("/", getAdminCustomization);
router.put("/", updateAdminCustomization);

module.exports = router;
