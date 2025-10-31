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

const { In, Between, MoreThanOrEqual } = require("typeorm");

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

    logger.info("[Report] start", { startDate, endDate });
    let details = null;
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
    if (dayjs(startDate).isAfter(dayjs(endDate))) {
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
    const tzName = isNotValidString(String(timezone))
      ? "Asia/Taipei"
      : String(timezone);

    const includeDetails = String(include_details) === "true";
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;
    if (
      pageNum <= 0 ||
      limitNum <= 0 ||
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
      .tz(`${startDate} 00:00:00`, tzName)
      .utc()
      .toISOString();
    const endISO = dayjs
      .tz(`${endDate} 00:00:00`, tzName)
      .add(1, "day")
      .utc()
      .toISOString(); //輸出成標準的 ISO 格式字串

    // 4) 撈訂單
    const orderRepo = dataSource.getRepository("Order");
    const orders = await orderRepo.find({
      where: {
        created_at: Between(startISO, endISO),
        order_status: In(["pending", "paid", "shipped", "completed"]), //訂單狀態
      },
      relations: ["orderItems"],
      order: { created_at: "ASC" },
    });
    // 5)KPI計算
    const totalOrders = orders.length; //計算訂單總數
    let totalItems = 0; //所有訂單裡的商品數量總和
    let totalRevenue = 0; // 原價小計
    let totalDiscount = 0; //優惠價加總
    let itemsNet = 0; // 實收小計
    for (const o of orders) {
      //逐一走訪每一筆訂單o,如果 o.items 是 null or undefined，就用空陣列，避免報錯。
      for (const it of o.orderItems || []) {
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
    //沒有 Refund：固定為 0，netRevenue = itemsNet
    const refundAmount = 0;
    const refundCount = 0;
    const netRevenue = itemsNet;
    const avgOrderValue =
      totalOrders > 0 ? Math.round((netRevenue / totalOrders) * 100) / 100 : 0;
    //  6) 退款 目前無 Refund 表
    // let refundAmount = 0; //總退款金額
    // let refundCount = 0; //退款筆數
    // try {
    //   const refundRepo = dataSource.getRepository("Refund");
    //   const refunds = await refundRepo.find({
    //     where: {
    //       orders: In(orders.map((o) => o.id)),
    //     },
    //   });
    //   refundAmount = refunds.reduce((s, r) => s + (Number(r.amount) || 0), 0);
    //   refundCount = refunds.length;
    // } catch (error) {
    //   logger.info("Refund table/repository 不存在，略過退款計算。");
    // }
    // // KPI：不含運費，以實收扣退款
    // const netRevenue = itemsNet - refundAmount;
    // const avgOrderValue =
    //   totalOrders > 0 ? Math.round((netRevenue / totalOrders) * 100) / 100 : 0;

    // 7) groups（日/週/月聚合；不分攤退款）=====
    const bucketOf = (createdAt) => {
      const d = dayjs(createdAt).tz(tzName);
      //startOf("week") = 把時間設到當週的第一天,format("YYYY-MM-DD") = 輸出成「年月日」字串。
      if (groupBy === "week") return d.startOf("week").format("YYYY-MM-DD");
      if (groupBy === "month") return d.startOf("month").format("YYYY-MM-DD");
      return d.format("YYYY-MM-DD"); //如果都不是（預設就是 day）
    };
    const groupsMap = new Map();
    for (const o of orders) {
      const key = bucketOf(o.created_at);
      if (!groupsMap.has(key)) {
        //檢查這個日期 key 在 Map 裡 有沒有存在。
        groupsMap.set(key, {
          date: key,
          orders: 0,
          items: 0,
          revenue: 0,
          discount: 0,
          net_revenue: 0,
        });
      }
      //取出分組的物件
      const g = groupsMap.get(key);
      g.orders += 1;

      let gItems = 0, //這一張訂單的總商品數量
        gOriginal = 0, //這一張訂單「原價總額」
        gNet = 0; //這一張訂單「實際收款總額」

      for (const it of o.orderItems || []) {
        const qty = Number(it.quantity || 0);
        const original = Number(it.original_price || 0);
        const unit = Number(it.unit_price || 0);

        gItems += qty;
        gOriginal += original * qty;
        gNet += unit * qty;
      }
      //把結果加到群組 (g)
      g.items += gItems; // 加總商品數量
      g.revenue += gOriginal; // 加總原價
      g.discount += Math.max(gOriginal - gNet, 0); // 折扣 = 原價 - 實收（不會小於 0）
      g.net_revenue += gNet; // 加總實收
    }
    //Array.from(groupsMap.values())：把 Map 的 value（每個群組物件）轉成陣列
    const groups = Array.from(groupsMap.values()).sort(
      (a, b) => a.date.localeCompare(b.date) //依照日期排序（由小到大）
    );
    //  8 details（可選；訂單級彙總，不含商品細項）
    if (includeDetails) {
      const [detailOrders, total] = await orderRepo.findAndCount({
        where: {
          created_at: Between(startISO, endISO),
          order_status: In(["pending", "paid", "shipped", "completed"]),
        },
        relations: ["orderItems"],
        order: {
          created_at: sort === "created_at_asc" ? "ASC" : "DESC",
        },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      });
      details = {
        pagination: { page: pageNum, limit: limitNum, total },
        orders: detailOrders.map((o) => {
          let grossOriginal = 0, //訂單「原價總額」
            grossNet = 0; //訂單實收總額
          for (const it of o.orderItems || []) {
            const qty = Number(it.quantity) || 0;
            const original = Number(it.original_price) || 0;
            const unit = Number(it.unit_price) || 0;
            grossOriginal += original * qty;
            grossNet += unit * qty;
          }
          const discount = Math.max(grossOriginal - grossNet, 0); //折扣金額
          const shippingFee = Number(o.shipping_fee) || 0;
          logger.info("[Report] success");
          return {
            order_id: o.id,
            created_at: new Date(o.created_at).toISOString(),
            status: o.order_status,
            items: (o.orderItems || []).length,
            subtotal: grossOriginal,
            discount,
            shipping_fee: shippingFee,
            total: grossNet + shippingFee,
            payment_method_id: o.payment_method_id ?? null,
          };
        }),
      };
    }
    res.status(200).json({
      status: "success",
      message: "查詢成功",
      data: {
        range: {
          start_date: startDate,
          end_date: endDate,
          group_by: groupBy,
          timezone: tzName,
        },
        kpi: {
          total_orders: totalOrders,
          total_items: totalItems,
          total_revenue: totalRevenue, //原價小計
          total_discount: totalDiscount, //折扣金額
          net_revenue: netRevenue, // 實收(不含運費)
          avg_order_value: avgOrderValue,
          refund_amount: refundAmount, // 固定 0
          refund_count: refundCount, // 固定 0
          conversion_rate: null,
        },
        groups,
        details,
      },
    });
  } catch (error) {
    logger.error({ error }, "銷售摘要報表產生失敗");
    next(error);
  }
};
const getHotProducts = async (req, res, next) => {
  try {
    // 參數：days/limit 可選，category_id 可選
    const dayRaw = String(req.query.days ?? "30");
    const limitRaw = String(req.query.limit ?? "20");
    const { category_id: categoryId } = req.query;
    const days = parseInt(dayRaw, 10);
    const limit = parseInt(limitRaw, 10);

    if (isNotValidInteger(days) || days > 365) {
      logger.warn(`[HotProducts]: days須為1-365的整數${days}`);
      res.status(400).json({
        status: "failed",
        message: "days須為1-365的整數",
      });
      return;
    }

    if (isNotValidInteger(limit) || limit > 100) {
      logger.warn(`[HotProducts]limit須為1-100的整數${limit}`);
      res.status(400).json({
        status: "failed",
        message: "limit 須為1-100的整數",
      });
    }
    if (!isUndefined(categoryId)) {
      if (isNotValidUUID(categoryId) || isNotValidString(categoryId)) {
        logger.warn(`[HorProducts]無效 category_id: ${categoryId}`);
        res.status(400).json({
          status: "failed",
          message: "欄位格式錯誤 category_id",
        });
        return;
      }
    }
    const since = new Date();
    //把這個日期往前推 days 天
    since.setDate(since.getDate() - days);

    const orderItemRepo = dataSource.getRepository("OrderItem");

    // ✅ 巢狀 where 直接在 Repository 過濾關聯條件
    const where = {
      order: {
        //MoreThanOrEqual>=
        created_at: MoreThanOrEqual(since),
        order_status: In(["PAID", "COMPLETED"]),
      },
      product: {
        is_active: true,
        ...(categoryId ? { categtory: { id: String(categoryId) } } : {}),
      },
    };
    // ✅ relations 決定要載入的關聯（不影響過濾條件）
    // ✅ select 只取需要的欄位，減少 payload
    const items = await orderItemRepo.find({
      where,
      relations: {
        product: {
          category: true, // 前端常要顯示分類、主圖
        },
      },
      select: {
        id: true,
        quantity: true,
        subtotal: true,
        order: { id: true, created_at: true, order_status: true },
        Product: {
          id: true,
          name: true,
          price: true,
          discount_price: true,
          is_active: true,
          updated_at: true,
          category: {
            id: true,
            name: true,
          },
          images: {
            id: true,
            image_url: true,
            is_main: true,
            sort_order: true,
          },
        },
      },
    });
    //  JS 端聚合到產品層級：sold_qty / sold_amount
    const agg = new Map(); // productId -> { product, qty, amount }
    for (const it of items) {
      const p = it.product;
      if (!p) continue;
      const key = p.id;
      if (!agg.has(key)) {
        agg.set(key, { product: p, aty: 0, amount: 0 });
      }
      const row = agg.get(key);
      row.qty += Number(it.quantity || 0);
      row.amount += Number(it.subtotal || 0);
    }

    // 依銷售量排序，其次銷售額，再次 updated_at（避免同分不穩定）
    const ranked = Array.from(agg.values())
      .sort((a, b) => {
        if (b.qty !== a.qty) return b.qty - a.qty;
        if (b.amount !== a.amount) return b.amount - a.amount;
        const au = a.product.updated_at
          ? new Date(a.product.updated_at).getTime()
          : 0;
        const bu = b.product.updated_at
          ? new Date(b.product.updated_at).getTime()
          : 0;
      })
      .slice(0, limit);

    // 整理輸出
    const data = ranked.map(({ product: p, qty, amount }) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      discount_price: p.discount_price,
      is_active: p.is_active,
      category: p.category
        ? { id: p.category.id, name: p.category.name }
        : null,
      cover_image_url:
        Array.isArray(p.images) && p.images.length
          ? p.images.find((i) => i.is_main || p.images[0].image_url)
          : null,
      sold_qty: qty,
      sold_amount: Number(amount.toFixed(2)),
    }));
    logger.info(
      `[Hotproducts] repo+relation day =${days} limit=${limit}` +
        (categoryId ? `category = ${categoryId}` : "" + `hit=${data.length}`)
    );
    return res.status(200).json({
      status: "success",
      message: `熱門商品排行(近${days}天銷售量)`,
      data,
      meta: { days, limit, category_id: categoryId ?? null },
    });
  } catch (error) {
    logger.warn(`[Hotproduct]: 查詢失敗${error.message}`);
    next(error);
  }
};

module.exports = { getSalesReport, getHotProducts };
