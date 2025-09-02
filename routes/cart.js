const express = require("express");
const router = express.Router();

const config = require("../config/index");

const { dataSource } = require("../db/data-source");

const logger = require("../utils/logger")("CartController");

const auth = require("../middlewares/auth")({
  //驗證 JWT 是否有效（防偽裝）
  secret: config.get("secret").jwtSecret,
  //查資料庫裡的使用者身分
  userRepository: dataSource.getRepository("User"),
  //把登入錯誤或成功的 log 記下來
  logger,
});

const { postCart, deleteCart, getCart } = require("../controllers/cart");

router.post("/items", auth, postCart);
router.delete("/:cart_item_id", auth, deleteCart);
router.get("/:cart_item_id", auth, getCart);

module.exports = router;
