const { dataSource } = require("../db/data-source");
const logger = require("../utils/logger")("OrderController");

const {
  isUndefined,
  isNotValidString,
  isNotValidInteger,
  isNotValidUUID,
  userNameReg,
  telReg,
} = require("../utils/validators");

const postOrder = async (req, res, next) => {
  try {
    const {
      shipping_name = shippingName,
      shipping_phone = shippingPhone,
      shipping_address = shippingAddress,
      payment_method_id = paymentMethodId,
      order_items = orderItems,
    } = req.body;
  } catch (error) {
    logger.error(`[Orders]建立訂單失敗 `);
    next(error);
  }
};

module.exports = {
  postOrder,
};
