const { dataSource } = require("../db/data-source");
const logger = require("../utils/logger")("AdminController");

const config = require("../config/index");

const {
  isUndefined,
  isNotValidString,
  isNotValidInteger,
  isNotValidUUID,
} = require("../utils/validators");

const postCategory = async (req, res, next) => {
  try {
  } catch (error) {
    logger.error(`建立產品失敗`);
    next(error);
  }
};

// const postProduct = async (req, res, next) => {
//   try {
//     const {
//       name,
//       category_id: categoryId,
//       description,
//       price,
//       discount_price: discountPrice,
//       is_active: isActive,
//       images = [],
//       variants = [],
//       tags = [],
//     } = req.body;
//     if (
//       // 基本欄位驗證（必要欄位）
//       isUndefined(name) ||
//       isNotValidString(name) ||
//       isUndefined(categoryId) ||
//       isNotValidUUID(categoryId) ||
//       isUndefined(price) ||
//       isNaN(Number(price)) ||
//       typeof isActive !== "boolean" ||
//       (description !== undefined && isNotValidString(description))
//     ) {
//       res.status(400).json({
//         status: "failed",
//         message: "欄位格式錯誤",
//       });
//       return;
//     }
//     //欄位可為 null，但若存在則需為數字
//     if (discountPrice != null && isNaN(Number(discountPrice))) {
//       res.status(400).json({
//         status: "failed",
//         message: "欄位格式錯誤",
//       });
//       return;
//     }
//     //images 陣列、內容物驗證
//     if (
//       !Array.isArray(images) ||
//       images.some(
//         (img) =>
//           !img.image_url ||
//           isNotValidString(img.image_url) ||
//           typeof img.is_main !== "boolean" ||
//           (img.sort_order !== undefined && isNotValidInteger(img.sort_order))
//       )
//     ) {
//       res.status(400).json({
//         status: "failed",
//         message: "欄位格式錯誤",
//       });
//       return;
//     }
//     //variants 陣列、內容物驗證
//     if (
//       !Array.isArray(variants) ||
//       variants.some(
//         (v) =>
//           isUndefined(v.option_name) ||
//           isNotValidString(v.option_name) ||
//           isUndefined(v.value) ||
//           isNotValidString(v.value) ||
//           isUndefined(v.stock) ||
//           isNotValidInteger(v.stock)
//       )
//     ) {
//       res.status(400).json({
//         status: "failed",
//         message: "欄位格式錯誤",
//       });
//       return;
//     }
//     if (!Array.isArray(tags) || tags.some((tag) => isNotValidString(tag))) {
//       res.status(400).json({
//         status: "failed",
//         message: "欄位格式錯誤",
//       });
//       return;
//     }
//     const productRepository = await dataSource.getRepository("Product");
//     const newProduct = await productRepository.create({
//       name,
//       category: { id: categoryId },
//       price,
//       discount_price: discountPrice,
//       description,
//       is_active: isActive,
//     });
//     const saveProduct = await productRepository.save(newProduct);
//     res.status(200).json({
//       status: "success",
//       message: "產品新增成功",
//     });
//   } catch (error) {
//     next(error);
//   }
// };

module.exports = {
  postCategory,
  postProduct,
};
