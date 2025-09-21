const express = require("express");
const router = express.Router();

const config = require("../config/index");
const { dataSource } = require("../db/data-source");
const logger = require("../utils/logger")("Favorites");

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
  postFavorites,
  deleteFavorites,
  getFavorites,
} = require("../controllers/favorites.js");

router.get("/", auth, getFavorites);
router.post("/", auth, postFavorites);
router.delete("/:product_id", auth, deleteFavorites);

module.exports = router;
