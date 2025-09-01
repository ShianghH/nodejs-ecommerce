const { dataSource } = require("../db/data-source");
const logger = require("../utils/logger")("CartController");

const {
  isUndefined,
  isNotValidString,
  isNotValidInteger,
  isNotValidUUID,
  numberReg,
} = require("../utils/validators");

const postCart = async (req, res, next) => {
  try {
    const { product_variants_id: productVariantId, quantity } = req.body;
    const userId = req.user.id;
    if (
      isUndefined(productVariantId) ||
      isNotValidString(productVariantId) ||
      isNotValidUUID(productVariantId) ||
      isUndefined(quantity) ||
      isNotValidInteger(quantity) ||
      quantity <= 0
    ) {
      res.status(400).json({
        status: "failed",
        message: "欄位格式錯誤",
      });
      return;
    }
    const cartRepo = dataSource.getRepository("CartItem");
    const existingItem = await cartRepo.findOne({
      where: {
        user: { id: userId },
        productVariant: { id: productVariantId },
      },
      relations: {
        user: true,
        productVariant: true,
      },
    });
    let cartItem;
    if (existingItem) {
      existingItem.quantity += quantity;
      cartItem = await cartRepo.save(existingItem);
    } else {
      cartItem = await cartRepo.save({
        user: { id: userId },
        productVariant: { id: productVariantId },
        quantity,
      });
    }
    res.status(200).json({
      status: "success",
      message: "商品已加入購物車",
      data: {
        id: cartItem.id,
        product_variant_id: productVariantId,
        quantity,
        created_at: cartItem.created_at,
        updated_at: cartItem.updated_at,
      },
    });
  } catch (error) {
    logger.warn(`[Cart] 加入購物車失敗:${error.message}`);
    next(error);
  }
};
const deleteCart = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { cartItem_id: cartItemID } = req.params;
    if (
      isUndefined(cartItemID) ||
      isNotValidString(cartItemID) ||
      isNotValidUUID(cartItemID)
    ) {
      res.status(400).json({
        status: "failed",
        message: "欄位格式錯誤",
      });
      return;
    }
    const cartRepo = dataSource.getRepository("CartItem");
    const cartItem = await cartRepo.findOne({
      where: {
        id: cartItemID,
      },
      relations: {
        user: true,
      },
    });
    if (!cartItem) {
      res.status(404).json({
        status: "failed",
        message: "購物車項目不存在",
      });
      return;
    }
    if (cartItem.user.id !== userId) {
      res.status(403).json({
        status: "failed",
        message: "您無權刪除這筆購物車項目",
      });
      return;
    }
    await cartRepo.remove(cartItem);
    res.status(200).json({
      status: "success",
      message: "購物車項目已刪除",
    });
  } catch (error) {
    logger.warn(`[Cart]刪除購物車商品失敗:${error.message}`);
    next(error);
  }
};
const getCart = async (req, res, next) => {
  try {
    const { cartItem_id: cartItemID } = req.params;
    if (
      isNotValidUUID(cartItemID) ||
      isUndefined(cartItemID) ||
      isNotValidString(cartItemID)
    ) {
      res.status(400).json({
        status: "failed",
        message: "欄位格式錯誤",
      });
      return;
    }
  } catch (error) {
    logger.warn();
    next(error);
  }
};

module.exports = {
  postCart,
  deleteCart,
  getCart,
};
