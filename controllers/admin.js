const { dataSource } = require("../db/data-source");
const logger = require("../utils/logger")("AdminController");

const config = require("../config/index");

const {
  isUndefined,
  isNotValidString,
  isNotValidInteger,
} = require("../utils/validators");

const putUserRole = async (req, res, next) => {};

module.exports = {
  putUserRole,
};
