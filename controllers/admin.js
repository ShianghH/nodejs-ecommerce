const { dataSource } = require("../db/data-source");
const logger = require("../utils/logger")("AdminController");

const {
  isUndefined,
  isNotValidString,
  isNotValidInteger,
  isNotValidUUID,
} = require("../utils/validators");

const postCategory = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    //必田欄位驗證
    if (
      isUndefined(name) ||
      isNotValidString(name) ||
      name.trim().length > 100 ||
      name.trim().length < 2
    ) {
      res.status(400).json({
        status: "failed",
        message: "請確認欄位格式與必填欄位",
      });
      return;
    }
    if (
      description !== undefined &&
      (isNotValidString(description) || description.trim().length > 300)
    ) {
      res.status(400).json({
        status: "failed",
        message: "分類描述格式錯誤或超過長度限制",
      });
      return;
    }
    const categoryRepository = await dataSource.getRepository(
      "ProductCategory"
    );
    //檢查名稱是否重複
    const existing = await categoryRepository.findOneBy({ name });
    if (existing) {
      res.status(409).json({
        status: "failed",
        message: "分類名稱已存在，請使用其他名稱",
      });
      return;
    }
    // 🆕 建立分類
    const newCategory = categoryRepository.create({
      name,
      description,
    });
    const saveCategory = await categoryRepository.save(newCategory);
    res.status(201).json({
      status: "success",
      message: "分類建立成功",
      data: {
        id: saveCategory.id,
        name: saveCategory.name,
        description: saveCategory.description,
        created_at: saveCategory.created_at,
        updated_at: saveCategory.updated_at,
      },
    });
  } catch (error) {
    logger.error(`[Category] 建立分類失敗: ${error.message}`);
    next(error);
  }
};

const postProduct = async (req, res, next) => {
  try {
    const {
      name,
      category_id: categoryId,
      description,
      price,
      discount_price: discountPrice,
      is_active: isActive,
      images = [],
      variants = [],
      tags = [],
    } = req.body;
    if (
      // 基本欄位驗證（必要欄位）
      isUndefined(name) ||
      isNotValidString(name) ||
      isUndefined(categoryId) ||
      isNotValidUUID(categoryId) ||
      isUndefined(price) ||
      isNaN(Number(price)) ||
      typeof isActive !== "boolean" ||
      (description !== undefined &&
        (isNotValidString(description) || description.trim().length > 1000))
    ) {
      res.status(400).json({
        status: "failed",
        message: "欄位格式錯誤",
      });
      return;
    }
    //欄位可為 null，但若存在則需為數字
    if (discountPrice != null && isNaN(Number(discountPrice))) {
      res.status(400).json({
        status: "failed",
        message: "欄位格式錯誤",
      });
      return;
    }
    //images 陣列、內容物驗證
    if (
      !Array.isArray(images) ||
      images.some(
        (img) =>
          !img.image_url ||
          isNotValidString(img.image_url) ||
          typeof img.is_main !== "boolean" ||
          (img.sort_order !== undefined && isNotValidInteger(img.sort_order))
      )
    ) {
      res.status(400).json({
        status: "failed",
        message: "欄位格式錯誤",
      });
      return;
    }
    //variants 陣列、內容物驗證
    if (
      !Array.isArray(variants) ||
      variants.some(
        (v) =>
          isUndefined(v.option_name) ||
          isNotValidString(v.option_name) ||
          isUndefined(v.value) ||
          isNotValidString(v.value) ||
          isUndefined(v.stock) ||
          isNotValidInteger(v.stock)
      )
    ) {
      res.status(400).json({
        status: "failed",
        message: "欄位格式錯誤",
      });
      return;
    }
    if (!Array.isArray(tags) || tags.some((tag) => isNotValidString(tag))) {
      res.status(400).json({
        status: "failed",
        message: "欄位格式錯誤",
      });
      return;
    }
    const productRepository = await dataSource.getRepository("Product");
    const newProduct = await productRepository.create({
      name,
      category: { id: categoryId },
      price,
      discount_price: discountPrice,
      description,
      is_active: isActive,
    });
    const saveProduct = await productRepository.save(newProduct);
    res.status(201).json({
      status: "success",
      message: "產品新增成功",
      data: {
        product_id: saveProduct.id,
      },
    });
  } catch (error) {
    logger.error(`[Product] 建立產品失敗: ${error.message}`);
    next(error);
  }
};

module.exports = {
  postCategory,
  postProduct,
};
