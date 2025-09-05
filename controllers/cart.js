const { dataSource } = require("../db/data-source");
const Order = require("../entities/Order");
const Product = require("../entities/Product");
const { param } = require("../routes/cart");
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
    const { cart_item_id: cartItemID } = req.params;
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
    const userId = req.user.id;
    const { page = 1 } = req.query;
    const pageToInt = parseInt(page, 10);
    const perPage = 10;
    const skip = (pageToInt - 1) * perPage;

    if (
      !numberReg.test(page) ||
      isNaN(pageToInt) ||
      pageToInt < 1 ||
      pageToInt % 1 !== 0
    ) {
      res.status(400).json({
        status: "failed",
        message: "請輸入有效的頁數",
      });
      return;
    }
    //1 撈資料
    const cartItemRepo = dataSource.getRepository("CartItem");
    const [row, total] = await cartItemRepo.findAndCount({
      where: {
        user: { id: userId },
      },
      relations: { productVariant: { product: true } },
      order: { created_at: "DESC" },
      skip,
      take: perPage,
    });
    //2. 整理回傳
    let totalQuantity = 0;
    let totalAmount = 0;
    const items = row.map((r) => {
      const variant = r.productVariant || null;
      const product = variant?.product || null;
      const price = Number(product?.price ?? 0);
      const discountPrice =
        product?.discount_price == null ? null : Number(product.discount_price);
      const unit = discountPrice !== null ? discountPrice : price;
      const qty = Number(r.quantity ?? 0);
      const subtotal = unit * qty;

      totalQuantity += qty;
      totalAmount += subtotal;

      return {
        cart_item_id: r.id,
        product_id: product?.id ?? null,
        variant_id: variant?.id ?? null,
        product_name: product?.name ?? null,
        option_name: variant?.option_name ?? null,
        option_value: variant?.value ?? null,
        price,
        discount_price: discountPrice,
        quantity: qty,
        subtotal,
        created_at: r.created_at,
        updated_at: r.updated_at,
      };
    });
    //3. 回傳結果
    res.status(200).json({
      status: "suceess",
      message: "查詢購物車成功",
      data: {
        items,
        meta: {
          page: pageToInt,
          limit: perPage,
          total,
          kpi: {
            total_quantity: totalQuantity,
            total_amount: totalAmount,
          },
        },
      },
    });
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
