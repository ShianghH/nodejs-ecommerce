const express = require("express");
const router = express.Router();

const config = require("../config/index");
const { dataSource } = require("../db/data-source.js");
const logger = require("../utils/logger.js")("Orders");

//初始化「身分驗證機器人」auth，傳入它需要的工具
const auth = require("../middlewares/auth.js")({
  //驗證 JWT 是否有效（防偽裝）
  secret: config.get("secret").jwtSecret,
  //查資料庫裡的使用者身分
  userRepository: dataSource.getRepository("User"),
  //把登入錯誤或成功的 log 記下來
  logger,
});

const {
  postOrder,
  getOrder,
  getOrderDetail,
} = require("../controllers/orders.js");

router.post("/", auth, postOrder);
router.get("/", auth, getOrder);
router.get("/:order_id", auth, getOrderDetail);

module.exports = router;
