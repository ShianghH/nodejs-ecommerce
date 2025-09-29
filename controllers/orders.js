const { dataSource } = require("../db/data-source");
const { stack } = require("../routes/orders");
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
    //1.基本驗證
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
          isNotValidInteger(item.quantity) ||
          Number(item.quantity) <= 0
      )
    ) {
      res.status(400).json({
        status: "failed",
        message: "欄位格式錯誤",
      });
      return;
    }
    const { id: userId } = req.user;

    //2 開始交易：所有動作要嘛全成功，要嘛全失敗
    const result = await dataSource.transaction(async (manager) => {
      const productRepo = manager.getRepository("Product");
      const variantRepo = manager.getRepository("ProductVariant");
      const orderRepository = manager.getRepository("Order");
      const orderItemsRepository = manager.getRepository("OrderItem");
      const paymentRepo = manager.getRepository("PaymentMethod");

      //2-1.付款方式存在檢查（避免外鍵失敗）
      const pm = await paymentRepo.findOne({ where: { id: paymentMethodId } });
      if (!pm) {
        const err = new Error("付款方式不存在");
        err.statusCode = 404;
        throw err;
      }
      //2-2. 逐項驗證商品/規格，計算金額（先不扣庫存）
      const orderItemData = [];
      for (const it of orderItems) {
        const product = await productRepo.findOne({
          where: { id: it.product_id },
          select: ["id", "price", "discount_price"],
        });
        if (!product) {
          const err = new Error("找不到商品");
          err.statusCode = 404;
          throw err;
        }

        // 用悲觀鎖鎖住該 variant，避免並發超賣
        const variant = await variantRepo.findOne({
          where: {
            id: it.variant_id,
            product: {
              id: it.product_id,
            },
          },
          relations: { product: true },
          lock: { mode: "pessimistic_write" }, //鎖這筆庫存列
        });
        if (!variant) {
          const err = new Error("商品規錯誤");
          err.statusCode = 404;
          throw err;
        }
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
      // 2-3. 建立主訂單
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
      //2-4 建立 order_items
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
      // 2-5) 逐筆扣庫存（條件更新：stock >= qty，否則視為不足）
      orderItemData.sort((a, b) => a.variant_id.localeCompare(b.variant_id));
      for (const i of orderItemData) {
        const updateRes = await manager
          .createQueryBuilder()
          .update("ProductVariant")
          .set({ stock: () => `stock - ${i.quantity}` })
          .where("id = :id", { id: i.variant_id })
          .andWhere("stock >= :qty", { qty: i.quantity })
          .execute();
        if (updateRes.affected !== 1) {
          const err = new Error("庫存不足");
          err.statusCode = 409;
          throw err;
        }
      }
      return newOrder;
    });

    // 3 成功提交
    logger.info(`[Order] 使用者 ${userId} 成功建立訂單`);
    return res.status(201).json({
      status: "success",
      message: "訂單建立成功",
      data: { order_id: result.id },
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

const cancelOrder = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { order_id: orderId } = req.params;
    const { reason } = req.body;
    if (isUndefined(orderId) || isNotValidUUID(orderId)) {
      res.status(400).json({
        status: "failed",
        message: "欄位格式錯誤:order_id",
      });
      return;
    }
    if (
      isUndefined(reason) ||
      isNotValidString(reason) ||
      reason.trim().length === 0 ||
      reason.length > 200
    ) {
      res.status(400).json({
        status: "failed",
        message: "欄位格式錯誤:reason",
      });
      return;
    }
    const orderRepo = dataSource.getRepository("Order");
    const order = await orderRepo.findOne({
      where: {
        id: { orderId },
      },
      relations: {
        user: true,
      },
      select: ["id", "order_status"],
    });
    if (!order) {
      res.status(404).json({
        status: "failed",
        message: "訂單不存在",
      });
      return;
    }
    if (order.user.id !== userId) {
      res.status(403).json({
        status: "failed",
        message: "無權限取消此訂單",
      });
      return;
    }
    if (order.order_status !== "pending") {
      res.status(409).json({
        status: "failed",
        message: "僅能取消 pending 狀態的訂單",
      });
      return;
    }
  } catch (error) {
    logger.warn(`[Order]: 取消訂單失敗`);
    next(error);
  }
};

module.exports = {
  postOrder,
  getOrder,
  getOrderDetail,
  cancelOrder,
};
