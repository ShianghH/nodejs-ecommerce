const express = require("express");
const router = express.Router();
const { getHotProducts } = require("../controllers/report.js");

router.get("/hot-products", getHotProducts);

module.exports = router;
