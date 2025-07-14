const { dataSource } = require("../db/data-source");
const logger = require("../utils/logger")("CategoryController");

const config = require("../config/index"); // 引入自訂的設定管理器，集中管理 db/web/secret 等設定

const {
  isUndefined,
  isNotValidString,
  isNotValidInteger,
  numberReg,
} = require("../utils/validators");
const { messaging } = require("firebase-admin");

const getCategories = async (req, res, next) => {
  try {
    const { page = 1 } = req.query;
    const pageToInt = parseInt(page, 10);
    const perPage = 10;
    const skip = (pageToInt - 1) * perPage;

    if (!numberReg.test(page) || page < 1 || page % 1 !== 0) {
      res.status(400).json({
        status: "failed",
        message: "請輸入有效的頁數",
      });
      return;
    }
    const categories = await dataSource.getRepository("ProductCategory").find({
      select: ["id", "name"],
      skip,
      take: perPage,
    });
    const total = await dataSource.getRepository("ProductCategory").count();
    res.status(200).json({
      status: "success",
      message: "查詢成功",
      data: categories,
      pagination: {
        page: pageToInt,
        limit: perPage,
        total,
      },
    });
  } catch (error) {
    logger.error(`[Category] 查詢分類失敗: ${error.message}`);
    next(error);
  }
};

module.exports = {
  getCategories,
};
