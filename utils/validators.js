const dayjs = require("dayjs");
const customParseFormat = require("dayjs/plugin/customParseFormat");
dayjs.extend(customParseFormat);

// 檢查傳入的值是否為 undefined（尚未被定義）
const isUndefined = (value) => value === undefined;

// 判斷傳入的值是否為無效字串：
// 不是字串類型、空字串、或只包含空白都會被視為無效
const isNotValidString = (value) => {
  return typeof value !== "string" || value.trim().length === 0;
};

// 判斷傳入的值是否為無效整數：
// 若非數字型別、為負數、或不是整數（小數）皆視為無效
const isNotValidInteger = (value) => {
  return typeof value !== "number" || value < 0 || value % 1 !== 0;
};

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const isNotValidUUID = (value) =>
  typeof value !== "string" || !uuidRegex.test(value.trim());

const numberReg = /^[0-9]+$/; //檢查一段字串是不是「只包含數字」

const telReg = /^09\d{8}$/;

const isNotValidDateYMD = (value) => {
  return !dayjs(value, "YYYY-MM-DD", true).isValid();
};

module.exports = {
  isUndefined,
  isNotValidString,
  isNotValidInteger,
  isNotValidUUID,
  isNotValidDateYMD,
  numberReg,
  telReg,
};
