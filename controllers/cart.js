const { dataSource } = require("../db/data-source");
const logger = require("../utils/logger")("CartController");
const config = require("../config/index");
const {
  isUndefined,
  isNotValidString,
  isNotValidInteger,
  numberReg,
} = require("../utils/validators");

const postCart = async (req, res, next) => {
  try {
  } catch (error) {
    logger.warn(`[Cart] 加入購物車失敗`);
    next(error);
  }
};

module.exports = {
  postCart,
};
