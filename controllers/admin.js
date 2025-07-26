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
    const categoryRepository =
      await dataSource.getRepository("ProductCategory");
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
    // === 建立主商品 ===
    const productRepository = await dataSource.getRepository("Product");
    const newProduct = await productRepository.create({
      name,
      category: { id: categoryId },
      price,
      discount_price: discountPrice,
      description,
      is_active: isActive,
    });
    const savedProduct = await productRepository.save(newProduct);
    // === 建立 images / variants ===
    await Promise.all([
      ...images.map((img) =>
        dataSource.getRepository("ProductImage").save({
          product: { id: savedProduct.id },
          image_url: img.image_url,
          is_main: img.is_main,
          sort_order: img.sort_order ?? 0,
        })
      ),
      ...variants.map((v) =>
        dataSource.getRepository("ProductVariant").save({
          product: { id: savedProduct.id },
          option_name: v.option_name,
          value: v.value,
          stock: v.stock,
        })
      ),
    ]);

    // === 處理 Tags：若不存在就建立 ===
    const tagRepository = dataSource.getRepository("Tag");
    const tagEntities = [];

    for (const tagName of tags) {
      // 先查是否存在
      let tag = await tagRepository.findOneBy({ name: tagName });

      // 若不存在，建立新 tag
      if (!tag) {
        tag = await tagRepository.save(tagRepository.create({ name: tagName }));
      }

      tagEntities.push(tag);
    }

    // 寫入 product_tags 中介表
    await Promise.all(
      tagEntities.map((tag, idx) =>
        dataSource.getRepository("ProductTag").save({
          product: { id: savedProduct.id },
          tag,
          sort_order: idx,
        })
      )
    );

    res.status(201).json({
      status: "success",
      message: "產品新增成功",
      data: {
        product_id: savedProduct.id,
      },
    });
  } catch (error) {
    logger.error(`[Product] 建立產品失敗: ${error.message}`);
    next(error);
  }
};

const postPaymentMethod = async (req, res, next) => {
  try {
    const { name } = req.body;
    if (
      isUndefined(name) ||
      isNotValidString(name) ||
      name.trim().length < 2 ||
      name.trim().length > 50
    ) {
      res.status(400).json({
        status: "failed",
        message: "欄位格式錯誤",
      });
      return;
    }
    const payRepository = await dataSource.getRepository("PaymentMethod");
    const payExisting = await payRepository.findOneBy({ name });
    if (payExisting) {
      res.status(409).json({
        status: "failed",
        message: "付款名稱已存在，請使用其他名稱",
      });
      return;
    }
    const newPay = payRepository.create({
      name,
    });
    const savePay = await payRepository.save(newPay);
    res.status(201).json({
      status: "success",
      message: "付款方式建立成功",
      data: {
        id: savePay.id,
        name: savePay.name,
      },
    });
  } catch (error) {
    logger.error(`[Admin] 新增付款失敗: ${error.message}`, error);
    next(error);
  }
};

const patchProduct = async (req, res, next) => {
  try {
    const { product_id: productId } = req.params;
    const {
      name,
      category_id,
      description,
      price,
      discount_price,
      is_active,
      images,
      variants,
      tags,
    } = req.body;
    if (!isValidUUID(productId)) {
      res.status(400).json({
        status: "failed",
        message: "商品 ID 格式錯誤",
      });
      return;
    }
    if (
      (name && isNotValidString(name)) ||
      (description && isNotValidString(description)) ||
      (price && isNotValidInteger(price)) ||
      (discount_price && isNotValidInteger(discount_price)) ||
      (is_active !== undefined && typeof is_active !== "boolean") ||
      (category_id && isNotValidUUID(category_id)) ||
      (images && !Array.isArray(images)) ||
      (variants && !Array.isArray(variants)) ||
      (tags && !Array.isArray(tags))
    ) {
      res.status(400).json({
        status: "failed",
        message: "欄位格式錯誤",
      });
      return;
    }
  } catch (error) {}
};

module.exports = {
  postCategory,
  postProduct,
  postPaymentMethod,
  patchProduct,
};
