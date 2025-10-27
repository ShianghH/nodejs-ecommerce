const { dataSource } = require("../db/data-source");
const logger = require("../utils/logger")("CategoryController");

const config = require("../config/index"); // 引入自訂的設定管理器，集中管理 db/web/secret 等設定

const {
  isUndefined,
  isNotValidString,
  isNotValidInteger,
  numberReg,
  isNotValidUUID,
} = require("../utils/validators");
const { stack } = require("../app");

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
const deleteCategories = async (req, res, next) => {
  try {
    const { category_id: categoryId } = req.params;
    if (
      isUndefined(categoryId) ||
      isNotValidUUID(categoryId) ||
      isNotValidString(categoryId)
    ) {
      res.status(400).json({
        status: "failed",
        message: "欄位格式錯誤",
      });
      return;
    }
    const categoryRepo = dataSource.getRepository("ProductCategory");
    const existing = await categoryRepo.findOne({
      where: {
        id: categoryId,
      },
    });
    if (!existing) {
      res.status(404).json({
        status: "failed",
        message: "分類不存在",
      });
      return;
    }
    const productRepo = dataSource.getRepository("Product");
    const productCount = await productRepo.count({
      where: {
        category: { id: categoryId },
      },
    });
    if (productCount > 0) {
      res.status(409).json({
        status: "failed",
        message: "該分類下仍有商品，無法刪除",
      });
      return;
    }
    await categoryRepo.softDelete(categoryId);
    res.status(200).json({
      status: "success",
      message: "分類刪除成功",
    });
  } catch (error) {
    logger.warn(`[Category] 刪除分類失敗:${error.message}`);
    next(error);
  }
};
const patchCategories = async (req, res, next) => {
  try {
    const { category_id: categoryId } = req.params;
    const { name, description } = req.body;

    if (
      isUndefined(categoryId) ||
      isNotValidUUID(categoryId) ||
      isNotValidString(categoryId)
    ) {
      res.status(400).json({
        status: "failed",
        message: "欄位格式錯誤",
      });
      return;
    }
    if (isUndefined(name) && isUndefined(description)) {
      res.status(400).json({
        status: "failed",
        message: "至少提供一個可更新的欄位(name or description)",
      });
      return;
    }
    //驗證name
    if (!isUndefined(name)) {
      if (isNotValidString(name)) {
        logger.warn(`[Category]name欄位格式錯誤`);
        res.status(400).json({
          status: "failed",
          message: "欄位格式錯誤(name)",
        });
        return;
      }
      if (name.trim().length > 100) {
        logger.warn("[Category] name 長度超過上限");
        res.status(400).json({
          status: "failed",
          message: "name 長度過長(上限100)",
        });
        return;
      }
    }

    //驗證description

    if (!isUndefined(description)) {
      if (isNotValidString(description)) {
        logger.warn(`[Category]description 格式錯誤`);
        res.status(400).json({
          status: "failed",
          message: "欄位格式錯誤",
        });
        return;
      }
      if (description.trim().length > 255) {
        logger.warn(`[Category]description 長度超過上限`);
        res.status(400).json({
          status: "failed",
          message: "description長度過長(上限255)",
        });
        return;
      }
    }
    //找出分類
    const categoryRepo = dataSource.getRepository("ProductCategory");
    const category = await categoryRepo.findOne({
      where: {
        id: categoryId,
      },
    });
    if (!category) {
      logger.warn(`[Category]找不到分類 category_id=${categoryId}`);
      res.status(404).json({
        status: "failed",
        message: "分類不存在",
      });
      return;
    }
    //檢查名稱重複
    if (!isUndefined(name)) {
      const exists = await categoryRepo.findOne({
        where: {
          name,
        },
      });
      if (exists && exists.id != category.id) {
        logger.warn(`[Category]名稱重複${exists.name}`);
        res.status(409).json({
          status: "failed",
          message: "分類名稱重複",
        });
        return;
      }
    }
    //update
    const patch = {};
    if (!isUndefined(name) && name.trim() !== category.name) {
      patch.name = name.trim();
    }
    if (
      !isUndefined(description) &&
      description.trim() !== category.description
    ) {
      patch.description = description.trim();
    }
    //無變更
    if (Object.keys(patch).length === 0) {
      logger.info(`[Category]id=${categoryId}無變更`);
      res.status(200).json({
        status: "success",
        message: "沒有變更",
        data: {
          id: category.id,
          name: category.name,
          description: category.description,
        },
      });
      return;
    }
    //實際更新
    const update = await categoryRepo.save({ ...category, ...patch });
    logger.info(`[Category]更新成功id=${categoryId},patch`);
    res.status(200).json({
      status: "success",
      message: "分類更新成功",
      data: {
        id: update.id,
        name: update.name,
        description: update.description,
      },
    });
  } catch (error) {
    logger.warn(`[Category]編輯分類失敗${error.message}`);
    next(error);
  }
};

module.exports = {
  getCategories,
  deleteCategories,
  patchCategories,
};
