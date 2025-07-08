const { dataSource } = require("../db/data-source");
const Product = require("../entities/Product");
const logger = require("../utils/logger")("ProductsController");

const {
  isUndefined,
  isNotValidString,
  isNotValidInteger,
  isNotValidUUID,
  numberReg,
} = require("../utils/validators");

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
          images: true,
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
    const formatted = products.map((p) => {
      // 從 images 陣列中找出主圖（is_main 為 true）
      const mainImage = p.images?.find((img) => img.is_main);

      return {
        id: p.id,
        name: p.name,
        price: p.price,
        discount_price: p.discount_price,
        is_active: p.is_active,
        main_image: mainImage?.image_url || null,
        category: {
          id: p.category?.id,
          name: p.category?.name,
        },
        created_at: p.created_at,
      };
    });

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

const getProductDetail = async (req, res, next) => {
  try {
    const { product_id: productId } = req.params;
    if (
      isNotValidString(productId) ||
      isUndefined(productId) ||
      isNotValidUUID(productId)
    ) {
      res.status(400).json({
        status: "failed",
        message: "欄位未填寫正確",
      });
      return;
    }
    const productDetail = await dataSource.getRepository("Product").findOne({
      select: {
        id: true,
        name: true,
        price: true,
        discount_price: true,
        description: true,
        is_active: true,
        category: {
          name: true,
        },
        created_at: true,
        updated_at: true,
      },
      where: { id: productId },
      relations: { category: true },
    });
    if (!productDetail) {
      res.status(404).json({
        status: "failed",
        message: "商品ID不存在",
      });
      return;
    }
    const productTag = await dataSource.getRepository("Tag").find({
      select: {
        id: true,
        name: true,
      },
      where: {
        products: {
          id: productId,
        },
      },
      relations: {
        products: true,
      },
    });
  } catch (error) {
    logger.error(`[ProductId] 查詢產品詳細失敗:${error.message}`);
    next(error);
  }
};

module.exports = {
  getProducts,
  getProductDetail,
};
