const express = require("express");
const router = express.Router();

//讀取網站設定檔，像是密碼、金鑰、埠號等
const config = require("../config/index");

//連接資料庫，取得資料倉庫工具（Repository）
const { dataSource } = require("../db/data-source.js");

// 建立一個紀錄器，用來記錄登入過程、錯誤等等，標籤叫 "Admin"
const logger = require("../utils/logger.js")("Admin");

//初始化「身分驗證機器人」auth，傳入它需要的工具
const auth = require("../middlewares/auth.js")({
  //驗證 JWT 是否有效（防偽裝）
  secret: config.get("secret").jwtSecret,
  //查資料庫裡的使用者身分
  userRepository: dataSource.getRepository("User"),
  //把登入錯誤或成功的 log 記下來
  logger,
});
const isAdmin = require("../middlewares/isAdmin.js");

const {
  postProduct,
  postCategory,
  postPaymentMethod,
} = require("../controllers/admin.js");

router.post("/category", auth, isAdmin, postCategory);
router.post("/products", auth, isAdmin, postProduct);
router.post("/paymentmethod", auth, isAdmin, postPaymentMethod);

module.exports = router;
