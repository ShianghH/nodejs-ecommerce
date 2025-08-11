const express = require("express");
const router = express.Router();

const config = require("../config/index");
const { dataSource } = require("../db/data-source");

const logger = require("../utils/logger")("Tags");

const auth = require("../middlewares/auth.js")({
  //驗證 JWT 是否有效（防偽裝）
  secret: config.get("secret").jwtSecret,
  //查資料庫裡的使用者身分
  userRepository: dataSource.getRepository("User"),
  //把登入錯誤或成功的 log 記下來
  logger,
});

const isAdmin = require("../middlewares/isAdmin.js");

const { deleteTags, getTags, patchTags } = require("../controllers/tags.js");

router.get("/", auth, isAdmin, getTags);
router.patch("/:tag_id", auth, isAdmin, patchTags);
router.delete("/:tag_id", auth, isAdmin, deleteTags);

module.exports = router;
