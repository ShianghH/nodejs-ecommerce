const express = require("express");
const router = express.Router();

const config = require("../config/index");
const { dataSource } = require("../db/data-source");
const logger = require("../utils/logger")("Paymentmehods");

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
  getPaymentMethods,
  postPaymentMethods,
  patchPaymentMethods,
} = require("../controllers/paymentmethods.js");

router.get("/", getPaymentMethods);
router.post("/", auth, isAdmin, postPaymentMethods);
router.patch("/:id", auth, isAdmin, patchPaymentMethods);

module.exports = router;
