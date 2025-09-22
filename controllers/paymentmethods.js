const { dataSource } = require("../db/data-source");

const logger = require("../utils/logger")("PaymenthodsController");

const {
  isUndefined,
  isNotValidString,
  isNotValidInteger,
  isNotValidUUID,
} = require("../utils/validators");

const getPaymentMethods = async (req, res, next) => {
  try {
  } catch (error) {
    logger.warn(`[PaymentMethods]取得付款方式失敗:${error.message}`);
    next(error);
  }
};

const postPaymentMethods = async (req, res, next) => {
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

module.exports = {
  getPaymentMethods,
  postPaymentMethods,
};
