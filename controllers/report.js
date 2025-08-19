const { dataSource } = require("../db/data-source");
const logger = require("../utils/logger")("ReportController");

const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const tz = require("dayjs/plugin/timezone");
dayjs.extend(utc);
dayjs.extend(tz);

const {
  isUndefined,
  isNotValidString,
  isNotValidInteger,
  isNotValidUUID,
  isNotValidDateYMD,
} = require("../utils/validators");

const { In, Between } = require("typeorm");

const getSalesReport = async (req, res, next) => {
  try {
    // 1) 取參數
    const {
      start_date: startDate,
      end_date: endDate,
      group_by = "day", // 預設按「天」分組 (可選: "day", "month", "year")
      timezone = "Asia/Taipei", // 預設時區
      include_details = "false", // 預設不帶詳細資訊
      page = 1,
      limit = 20,
      sort = "created_at_desc",
    } = req.query;
    // 2) 基本驗證
    if (
      isUndefined(startDate) ||
      isNotValidString(startDate) ||
      isUndefined(endDate) ||
      isNotValidString(endDate) ||
      isNotValidDateYMD(startDate) ||
      isNotValidDateYMD(endDate)
    ) {
      res.status(400).json({
        status: "failed",
        message: "查詢參數錯誤",
      });
      return;
    }
    //2.1日期區間
    if (dayjs(startDate).isAfter(endDate)) {
      res.status(400).json({
        status: "failed",
        message: "start_date 不得晚於 end_date",
      });
      return;
    }
    // 2.2 group_by 白名單
    const groupBy = ["day", "week", "month"].includes(String(group_by))
      ? String(group_by)
      : "day";
    const tzName = isNotValidString(String(timezone));
    const includeDetails = String(include_details) === "true";
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;
    if (
      pageNum <= 0 ||
      limit <= 0 ||
      isNotValidInteger(pageNum) ||
      isNotValidInteger(limitNum)
    ) {
      logger.warn("查詢參數錯誤：page / limit 需為正整數");
      res.status(400).json({
        status: "failed",
        message: "欄位格式錯誤",
      });
      return;
    }
    // 3) 時區處理
    const startISO = dayjs
      .tz(`${start_date} 00:00:00`, tzName)
      .utc()
      .toISOString();
    const endISO = dayjs
      .tz(`${end_date} 00:00:00`, tzName)
      .add(1, "day")
      .utc()
      .toISOString(); //輸出成標準的 ISO 格式字串

    // 4) 撈訂單
    const orderRepo = dataSource.getRepository("Order");
    const orders = await orderRepo.find({
      where: {
        created_at: Between(startISO, endISO),
        status: In(["paid", "shipped", "completd"]), //訂單狀態
      },
      relations: ["Items", "items.product", "items.product.category"],
      order: { created_at: "ASC" },
    });
    //KPI計算
    let totalOrder = orders.length; //計算訂單總數
    let totalItems = 0; //所有訂單裡的商品數量總和
    let totalRevenue = 0; // 原價小計
    let totalDiscount = 0; //優惠價加總
    let itemsNet = 0; // 實收小計
    for (const o of orders) {
      //逐一走訪每一筆訂單o,如果 o.items 是 null or undefined，就用空陣列，避免報錯。
      for (const it of o.items || []) {
        const qty = Number(it.quantity) || 0;
        const original = Number(it.original_price) || 0;
        const unit = Number(it.unit_price) || 0;
        totalItems += qty;
        totalRevenue += original * qty;
        itemsNet += unit * qty;
        const diff = (original - unit) * qty;
        totalDiscount += diff > 0 ? diff : 0; // // 如果是正數就加上，否則算 0
      }
    }
  } catch (error) {}
};

module.exports = { getSalesReport };
