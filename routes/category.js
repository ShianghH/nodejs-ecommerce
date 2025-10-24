const express = require("express");

const router = express.Router();

//讀取網站設定檔，像是密碼、金鑰、埠號等
const config = require("../config/index");

//連接資料庫，取得資料倉庫工具（Repository）
const { dataSource } = require("../db/data-source");
const logger = require("../utils/logger")("CategoryController");

const auth = require("../middlewares/auth")({
  //驗證 JWT 是否有效（防偽裝）
  secret: config.get("secret").jwtSecret,
  //查資料庫裡的使用者身分
  userRepository: dataSource.getRepository("User"),
  //把登入錯誤或成功的 log 記下來
  logger,
});
const isAdmin = require("../middlewares/isAdmin");
const {
  getCategories,
  deleteCategories,
  patchCategories,
} = require("../controllers/category");

router.get("/", getCategories);
router.delete("/:category_id", auth, isAdmin, deleteCategories);
router.patch("/:category_id", auth, isAdmin, patchCategories);

module.exports = router;
