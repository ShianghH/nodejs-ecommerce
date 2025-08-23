const express = require("express");
const router = express.Router();
const config = require("../config/index");
const { dataSource } = require("../db/data-source");

const logger = require("../utils/logger")("Admin");

const auth = require("../middlewares/auth.js")({
  //驗證 JWT 是否有效（防偽裝）
  secret: config.get("secret").jwtSecret,
  //查資料庫裡的使用者身分
  userRepository: dataSource.getRepository("User"),
  //把登入錯誤或成功的 log 記下來
  logger,
});
const isAdmin = require("../middlewares/isAdmin.js");

const { getSalesReport } = require("../controllers/report.js");

router.get("/", auth, isAdmin, getSalesReport);

module.exports = router;
