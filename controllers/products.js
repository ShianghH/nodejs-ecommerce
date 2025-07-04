const { dataSource } = require("../db/data-source");
const Product = require("../entities/Product");
const logger = require("../utils/logger")("ProductsController");

const {
  isUndefined,
  isNotValidString,
  isNotValidInteger,
  isNotValidUUID,
} = require("../utils/validators");

const numberReg = /^[0-9]+$/; //檢查一段字串是不是「只包含數字」

const getProducts = async (req, res, next) => {
  try {
    const { page = 1, category = "" } = req.query;

    const pageToInt = parseInt(page, 10);
    const perPage = 10;
    const skip = (pageToInt - 1) * perPage;

    // 驗證 page 與 category
    if (
      !numberReg.test(page) ||
      pageToInt < 1 ||
      typeof category !== "string"
    ) {
      logger.warn("頁數輸入錯誤");
      return res.status(400).json({
        status: "failed",
        message: "請輸入有效的頁數",
      });
    }

    logger.debug(`category: ${category}`);

    // 先找分類（如果有傳）
    let categoryCondition = {};
    if (category !== "") {
      const categoryEntity = await dataSource
        .getRepository("ProductCategory")
        .findOne({
          select: ["id", "name"],
          where: { name: category },
        });

      if (!categoryEntity) {
        logger.warn(`[Products] 找不到該分類: ${category}`);
        return res.status(404).json({
          status: "failed",
          message: "找不到該分類",
        });
      }

      categoryCondition.category = { id: categoryEntity.id };
    }

    // 組查詢條件
    const productWhereOptions = {
      is_active: true,
      ...categoryCondition,
    };

    // 查商品 + 類別（JOIN）
    const [products, total] = await dataSource
      .getRepository("Product")
      .findAndCount({
        where: productWhereOptions,
        relations: {
          category: true, // 關聯 Category
        },
        select: {
          id: true,
          name: true,
          price: true,
          discount_price: true,
          is_active: true,
          created_at: true,
          category: {
            id: true,
            name: true,
          },
        },
        skip,
        take: perPage,
        order: {
          created_at: "DESC",
        },
      });

    // 整理回傳格式
    const formatted = products.map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      discount_price: p.discount_price,
      is_active: p.is_active,
      category: {
        id: p.category?.id,
        name: p.category?.name,
      },
      created_at: p.created_at,
    }));

    return res.status(200).json({
      status: "success",
      message: "查詢成功",
      data: {
        products: formatted,
        pagination: {
          page: pageToInt,
          limit: perPage,
          total,
        },
      },
    });
  } catch (error) {
    logger.error(`[Products] 查詢產品列表失敗: ${error.message}`);
    next(error);
  }
};

module.exports = {
  getProducts,
};
