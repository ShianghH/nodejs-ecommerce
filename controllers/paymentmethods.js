const { dataSource } = require("../db/data-source");

const logger = require("../utils/logger")("PaymentMethodsController");

const {
  isUndefined,
  isNotValidString,
  isNotValidInteger,
  isNotValidUUID,
} = require("../utils/validators");

const { Not } = require("typeorm");

const getPaymentMethods = async (req, res, next) => {
  try {
    const paymentRepo = dataSource.getRepository("PaymentMethod");
    const payment = await paymentRepo.find({
      select: ["id", "name"],
    });
    res.status(200).json({
      status: "success",
      message: "查詢成功",
      data: {
        payment,
      },
    });
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
const patchPaymentMethods = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, is_active } = req.body;

    //基本驗證
    const idNum = parseInt(id, 10);
    if (Number.isNaN(idNum) || isNotValidInteger(idNum) || idNum <= 0) {
      logger.warn("[PaymentMethods] id 格式錯誤");
      res.status(400).json({
        status: "failed",
        message: "欄位格式錯誤",
      });
      return;
    }
    //要提供一個可更新欄位
    if (isUndefined(name) && isUndefined(is_active)) {
      logger.warn("[PaymentMethods] 未提供可更新欄位");
      res.status(400).json({
        status: "failed",
        message: "至少提供一個可更新欄位（name 或 is_active）",
      });
      return;
    }
    //驗證 name
    let nameTrim;
    if (!isUndefined(name)) {
      if (isNotValidString(name)) {
        logger.warn("[PaymentMethods] name 欄位格式錯誤");
        res.status(400).json({
          status: "failed",
          message: "欄位格式錯誤",
        });
        return;
      }
      nameTrim = String(name).trim();
      if (nameTrim.length > 50) {
        logger.warn("[PaymentMethods] name 長度過長");
        res.status(400).json({
          status: "failed",
          message: "名稱長度過長（上限 50）",
        });
        return;
      }
    }

    //驗證is_active
    if (!isUndefined(is_active) && typeof is_active !== "boolean") {
      logger.warn("[PaymentMethods] is_active 欄位需為布林");
      res.status(400).json({
        status: "failed",
        message: "is_active 需為布林值（true/false）",
      });
      return;
    }
    //取的付款方式
    const payRepo = dataSource.getRepository("PaymentMethod");
    const pay = await payRepo.findOne({ where: { id: idNum } });
    if (!pay) {
      logger.warn(`[PaymentMethods] 找不到 id=${idNum}`);
      res.status(404).json({
        status: "failed",
        message: "付款方式不存在",
      });
      return;
    }
    //重複名稱檢查
    if (!isUndefined(nameTrim)) {
      const exists = await payRepo.findOne({
        where: { name: nameTrim, id: Not(idNum) },
      });
      if (exists) {
        logger.warn(`[PaymentMethods] 名稱重複：${nameTrim}`);
        res.status(409).json({
          status: "failed",
          message: "付款方式名稱已存在",
        });
        return;
      }
    }

    // 更新(只更新有變更者)
    const patch = {};
    if (!isUndefined(nameTrim) && nameTrim !== pay.name) {
      patch.name = nameTrim;
    }
    if (!isUndefined(is_active) && is_active !== pay.is_active) {
      patch.is_active = is_active;
    }

    //無變更就回
    if (Object.keys(patch).length === 0) {
      logger.info(`[PaymentMethods] id=${idNum} 無變更`);
      res.status(200).json({
        status: "success",
        message: "沒有任何變更",
        data: { id: pay.id, name: pay.name, is_active: pay.is_active },
      });
      return;
    }

    //儲存
    const updated = await payRepo.save({ ...pay, ...patch });
    logger.info(`[PaymentMethods] 更新成功 id=${idNum}`, patch);
    res.status(200).json({
      status: "success",
      message: "付款方式已更新",
      data: {
        id: updated.id,
        name: updated.name,
        is_active: updated.is_active,
      },
    });
  } catch (error) {
    logger.warn(`[PaymentMethods]:更改付款方式失敗${error.message}`);
    next(error);
  }
};

module.exports = {
  getPaymentMethods,
  postPaymentMethods,
  patchPaymentMethods,
};
