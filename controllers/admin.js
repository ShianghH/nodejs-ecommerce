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
    const categoryRepository = dataSource.getRepository("ProductCategory");
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
    if (!isUndefined(discountPrice) && discountPrice !== null) {
      if (typeof discountPrice !== "number" || isNaN(Number(discountPrice))) {
        res.status(400).json({
          status: "failed",
          message: "折扣價必須為有效數字",
        });
        return;
      }
    }
    //避免折扣價>原價
    if (discountPrice !== null) {
      const dp = Number(discountPrice);
      if (dp < 0 || dp > price) {
        res.status(400).json({
          status: "failed",
          message: "折扣價需小於原價且不可為負數",
        });
        return;
      }
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

    // === 建立主商品 ===
    const categoryRepository = dataSource.getRepository("ProductCategory");
    const category = await categoryRepository.findOneBy({ id: categoryId });

    if (!category) {
      return res.status(400).json({
        status: "failed",
        message: "指定的分類不存在，請確認 category_id 是否正確",
      });
    }

    const productRepository = dataSource.getRepository("Product");
    const newProduct = productRepository.create({
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

    res.status(201).json({
      status: "success",
      message: "產品新增成功",
      data: { product_id: savedProduct.id },
    });
  } catch (error) {
    logger.error(`[Product] 建立產品失敗: ${error.message}`);
    next(error);
  }
};

const patchProduct = async (req, res, next) => {
  try {
    const { product_id: productId } = req.params;
    logger.info(`[PATCH] 收到更新商品請求 id: ${productId}`);

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

    if (isNotValidUUID(productId)) {
      return res
        .status(400)
        .json({ status: "failed", message: "商品 ID 格式錯誤" });
    }

    const productRepo = dataSource.getRepository("Product");
    const imageRepo = dataSource.getRepository("ProductImage");
    const variantRepo = dataSource.getRepository("ProductVariant");
    const categoryRepo = dataSource.getRepository("ProductCategory");
    const tagRepo = dataSource.getRepository("Tag");
    const productTagRepo = dataSource.getRepository("ProductTag");

    const product = await productRepo.findOne({
      where: { id: productId },
      relations: {
        category: true,
        images: true,
        variants: true,
      },
    });

    if (!product) {
      return res.status(404).json({ status: "failed", message: "商品不存在" });
    }

    // 更新基本欄位
    if (!isUndefined(name)) product.name = name;
    if (!isUndefined(description)) product.description = description;
    if (!isUndefined(price)) product.price = price;
    if (!isUndefined(discount_price)) product.discount_price = discount_price;
    if (typeof is_active === "boolean") product.is_active = is_active;

    // 更新分類
    if (category_id) {
      const category = await categoryRepo.findOne({
        where: { id: category_id },
      });
      if (!category) {
        return res
          .status(404)
          .json({ status: "failed", message: "分類不存在" });
      }
      product.category = category;
    }

    // 刪除舊圖片並重建圖片關聯
    if (images && Array.isArray(images)) {
      await imageRepo.delete({ product: { id: productId } });

      product.images = images.map((img) =>
        imageRepo.create({
          image_url: img.image_url,
          is_main: img.is_main,
          sort_order: img.sort_order ?? 0,
          product: product, // 給整個實體，避免 null 關聯
        })
      );
    }

    // 刪除舊 variants 並重建
    if (variants && Array.isArray(variants)) {
      await variantRepo.delete({ product: { id: productId } });

      product.variants = variants.map((v) =>
        variantRepo.create({
          option_name: v.option_name,
          value: v.value,
          stock: v.stock,
          product: product,
        })
      );
    }

    // 刪除舊 tag 關聯並重建
    if (tags && Array.isArray(tags)) {
      await productTagRepo.delete({ product: { id: productId } });

      const tagRelations = [];
      for (let i = 0; i < tags.length; i++) {
        const tagName = tags[i];
        let tag = await tagRepo.findOneBy({ name: tagName });

        if (!tag) {
          tag = await tagRepo.save(tagRepo.create({ name: tagName }));
        }

        tagRelations.push(
          productTagRepo.create({
            product: product,
            tag: tag,
            sort_order: i,
          })
        );
      }

      product.productTags = tagRelations;
    }

    const updatedProduct = await productRepo.save(product);

    logger.info(`[PATCH] 商品更新成功 id: ${productId}`);
    res.status(200).json({
      status: "success",
      message: "商品更新成功",
      data: {
        id: updatedProduct.id,
        name: updatedProduct.name,
        price: updatedProduct.price,
        discount_price: updatedProduct.discount_price,
        description: updatedProduct.description,
        is_active: updatedProduct.is_active,
        category: updatedProduct.category,
        updated_at: updatedProduct.updated_at,
      },
    });
  } catch (error) {
    logger.error(`[Admin] 編輯商品失敗`, error);
    next(error);
  }
};

const deleteProduct = async (req, res, next) => {
  try {
    const { product_id: productId } = req.params;
    if (
      isNotValidUUID(productId) ||
      isNotValidString(productId) ||
      isUndefined(productId)
    ) {
      res.status(400).json({
        status: "failed",
        message: "欄位格式錯誤",
      });
      return;
    }
    const productRepo = dataSource.getRepository("Product");
    const imageRepo = dataSource.getRepository("ProductImage");
    const variantRepo = dataSource.getRepository("ProductVariant");
    const productTagRepo = dataSource.getRepository("ProductTag");
    const product = await productRepo.findOne({
      where: {
        id: productId,
      },
      relations: {
        images: true,
        variants: true,
        productTags: true,
      },
    });
    if (!product) {
      res.status(404).json({
        status: "failed",
        message: "商品不存在",
      });
      return;
    }
    await productRepo.softDelete(productId);
    await imageRepo.softDelete({ product: { id: productId } });
    await variantRepo.softDelete({ product: { id: productId } });
    await productTagRepo.softDelete({ product: { id: productId } });
    res.status(200).json({
      status: "success",
      message: "刪除商品成功",
    });
  } catch (error) {
    logger.warn(`[DELETE] 刪除產品失敗:${error.message}`);
    next(error);
  }
};

const postTag = async (req, res, next) => {
  try {
    const { name } = req.body;
    if (isUndefined(name) || isNotValidString(name)) {
      logger.warn(`[Tag]欄位格式錯誤`);
      res.status(400).json({
        status: "failed",
        message: "欄位格式錯誤",
      });
      return;
    }
    const nameTrim = name.trim();
    if (nameTrim.length > 100) {
      logger.warn(`[Tag]name長度過長`);
      res.status(400).json({
        status: "failed",
        message: "名稱長度過長(上限100)",
      });
      return;
    }
    const tagRepo = dataSource.getRepository("Tag");
    const existing = await tagRepo.findOne({
      where: {
        name: nameTrim,
      },
    });
    if (existing) {
      logger.warn(`[Tag]名稱重複:${nameTrim}`);
      res.status(409).json({
        status: "failed",
        message: "標籤名稱已存在",
      });
      return;
    }
    const newTag = tagRepo.create({ name: nameTrim });
    const saved = await tagRepo.save(newTag);

    logger.info(`[Tag]新增標籤成功 ${saved.name}`);
    res.status(201).json({
      status: "success",
      message: "標籤建立成功",
      data: {
        id: saved.id,
        name: saved.name,
        created_at: saved.created_at,
      },
    });
  } catch (error) {
    logger.warn(`[Tag]新增標籤失敗:${error.message}`);
    next(error);
  }
};

module.exports = {
  postCategory,
  postProduct,
  patchProduct,
  deleteProduct,
  postTag,
};
