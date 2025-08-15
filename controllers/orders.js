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
    const { page = 1 } = req.query;
    const userId = req.user.id;
    const pageToInt = parseInt(page, 10);
    const perPage = 10;
    const skip = (pageToInt - 1) * perPage;
    if (!numberReg.test(page) || pageToInt < 1 || isNaN(pageToInt)) {
      res.status(400).json({
        status: "failed",
        message: "請輸入有效的頁數",
      });
      return;
    }
    const orderRepo = dataSource.getRepository("Order");
    const [orders, total] = await orderRepo.findAndCount({
      where: {
        user: { id: userId },
      },
      relations: {
        payment_method: true,
      },
      select: {
        id: true,
        order_status: true,
        subtotal: true,
        created_at: true,
        payment_method: {
          name: true,
        },
      },
      order: {
        created_at: "DESC",
      },
      skip,
      take: perPage,
    });
    res.status(200).json({
      status: "success",
      message: "查詢成功",
      data: {
        orders: orders.map((o) => ({
          order_id: o.id,
          status: o.order_status,
          subtotal: o.subtotal,
          payment: o.payment_method?.name || "未知",
          created_at: o.created_at,
        })),
        pagination: {
          page: pageToInt,
          limit: perPage,
          total,
        },
      },
    });
  } catch (error) {
    logger.error(`[Order] 查詢訂單失敗 `);
    next(error);
  }
};

const getOrderDetail = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { order_id: orderId } = req.params;
    if (
      isUndefined(orderId) ||
      isNotValidString(orderId) ||
      isNotValidUUID(orderId)
    ) {
      res.status(400).json({
        status: "failed",
        message: "欄位格式錯誤",
      });
      return;
    }
    //查有無訂單
    const orderRepo = dataSource.getRepository("Order");
    const order = await orderRepo.findOne({
      where: {
        id: orderId,
        user: {
          id: userId,
        },
      },
      relations: {
        payment_method: true,
      },
    });
    if (!order) {
      res.status(404).json({
        status: "failed",
        message: "查無此訂單",
      });
      return;
    }
    //查訂單項目 + 商品規格 + 商品
    const orderItems = await dataSource.getRepository("OrderItem").find({
      where: {
        order: { id: orderId },
      },
      relations: {
        product_variant: {
          product: true,
        },
      },
    });
    const items = orderItems.map((i) => ({
      product_name: i.product_variant.product.name,
      option_name: i.product_variant.option_name,
      value: i.product_variant.value,
      quantity: i.quantity,
      original_price: i.original_price,
      unit_price: i.unit_price,
      subtotal: i.subtotal,
    }));
    res.status(200).json({
      status: "success",
      message: "查詢成功",
      data: {
        order: {
          id: order.id,
          order_status: order.order_status,
          shipping_name: order.shipping_name,
          shipping_phone: order.shipping_phone,
          shipping_address: order.shipping_address,
          payment: order.payment_method.name,
          subtotal: order.subtotal,
          items,
          created_at: order.created_at,
        },
      },
    });
  } catch (error) {
    logger.warn(`[Order] 查詢訂單錯誤}`, error);
    next(error);
  }
};

module.exports = {
  postOrder,
  getOrder,
  getOrderDetail,
};
