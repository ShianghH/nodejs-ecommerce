const { messaging } = require("firebase-admin");
const { dataSource } = require("../db/data-source");
const logger = require("../utils/logger")("OrderController");

const {
  isUndefined,
  isNotValidString,
  isNotValidInteger,
  isNotValidUUID,
  numberReg,
  telReg,
} = require("../utils/validators");

const postOrder = async (req, res, next) => {
  try {
    const {
      shipping_name: shippingName,
      shipping_phone: shippingPhone,
      shipping_address: shippingAddress,
      payment_method_id: paymentMethodId,
      order_items: orderItems,
    } = req.body;
    if (
      isUndefined(shippingName) ||
      isNotValidString(shippingName) ||
      isUndefined(shippingPhone) ||
      isNotValidString(shippingPhone) ||
      !telReg.test(shippingPhone) ||
      isUndefined(shippingAddress) ||
      isNotValidString(shippingAddress) ||
      isUndefined(paymentMethodId) ||
      isNotValidInteger(paymentMethodId) ||
      !Array.isArray(orderItems)
    ) {
      res.status(400).json({
        status: "failed",
        message: "欄位格式錯誤",
      });
      return;
    }
    if (
      orderItems.length === 0 ||
      orderItems.some(
        (item) =>
          isUndefined(item.product_id) ||
          isNotValidUUID(item.product_id) ||
          isUndefined(item.variant_id) ||
          isNotValidUUID(item.variant_id) ||
          isUndefined(item.quantity) ||
          isNotValidInteger(item.quantity)
      )
    ) {
      res.status(400).json({
        status: "failed",
        message: "欄位格式錯誤",
      });
      return;
    }
    //驗證產品ID、變體ID是否存在
    const productRepo = await dataSource.getRepository("Product");
    const variantRepo = dataSource.getRepository("ProductVariant");

    const orderItemData = [];

    for (const it of orderItems) {
      // 先確認 product 存在
      const product = await productRepo.findOne({
        where: { id: it.product_id },
        select: ["id", "price", "discount_price"],
      });
      if (!product) {
        logger.warn(`[Product] 無此產品ID ${it.product_id}`);
        res.status(404).json({
          status: "failed",
          message: "找不到商品",
        });
        return;
      }

      // 查 variant並確定隸屬於剛剛那個 product
      const variant = await variantRepo.findOne({
        where: { id: it.variant_id, product: { id: it.product_id } }, // 🔸 雙條件
        relations: { product: true },
      });
      if (!variant) {
        logger.warn(`[Variant] 商品規錯誤 ${it.variant_id}`);
        res.status(404).json({
          status: "failed",
          message: "商品規格錯誤",
        });
        return;
      }

      //  計算金額
      const original = Number(product.price);
      const unit = Number(product.discount_price ?? original);
      orderItemData.push({
        variant_id: it.variant_id,
        quantity: it.quantity,
        original_price: original,
        unit_price: unit,
        subtotal: unit * it.quantity,
      });
    }
    const totalBefore = orderItemData.reduce(
      (sum, i) => sum + i.original_price * i.quantity,
      0
    );
    const totalAfter = orderItemData.reduce((sum, i) => sum + i.subtotal, 0);
    const discountAmt = totalBefore - totalAfter;

    /* 3. 建立主訂單 ---------------------------------------------------- */
    const { id: userId } = req.user;
    const orderRepository = dataSource.getRepository("Order");
    const orderItemsRepository = dataSource.getRepository("OrderItem");

    const newOrder = await orderRepository.save(
      orderRepository.create({
        user: { id: userId },
        order_status: "pending",
        shipping_name: shippingName,
        shipping_phone: shippingPhone,
        shipping_address: shippingAddress,
        payment_method: { id: paymentMethodId },
        total_before_discount: totalBefore,
        discount_amount: discountAmt,
        subtotal: totalAfter,
      })
    );

    /* 4. 建立 order_items ---------------------------------------------- */
    await orderItemsRepository.insert(
      orderItemData.map((i) => ({
        order: { id: newOrder.id },
        product_variant: { id: i.variant_id },
        quantity: i.quantity,
        original_price: i.original_price,
        unit_price: i.unit_price,
        subtotal: i.subtotal,
      }))
    );

    /* 5. 回傳成功 ------------------------------------------------------ */
    logger.info(`[Order] 使用者 ${userId} 成功建立訂單`);
    return res.status(201).json({
      status: "success",
      message: "訂單建立成功",
      data: { order_id: newOrder.id },
    });
  } catch (error) {
    logger.error(`[Orders]建立訂單失敗 `);
    next(error);
  }
};

const getOrder = async (req, res, next) => {
  try {
  } catch (error) {
    logger.error(`[Order] 查詢訂單失敗 `);
    next(error);
  }
};

module.exports = {
  postOrder,
  getOrder,
};
