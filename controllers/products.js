const { ILike } = require("typeorm");
const { dataSource } = require("../db/data-source");
const logger = require("../utils/logger")("ProductsController");

const {
  isUndefined,
  isNotValidString,
  isNotValidInteger,
  isNotValidUUID,
  numberReg,
} = require("../utils/validators");

const getProducts = async (req, res, next) => {
  try {
    const {
      page = 1,
      category = "",
      category_id: categoryId = "",
      keyword = "",
      min_price: minPrice = "",
      max_price: maxPrice = "",
      sort = "created_at_desc",
    } = req.query;

    const pageToInt = parseInt(page, 10);
    const perPage = 10;
    const skip = (pageToInt - 1) * perPage;

    // 驗證 page 與 category
    if (
      !numberReg.test(page) ||
      pageToInt < 1 ||
      typeof category !== "string"
    ) {
      logger.warn("頁數輸入錯誤");
      return res.status(400).json({
        status: "failed",
        message: "請輸入有效的頁數",
      });
    }
    if (typeof category !== "string" || typeof keyword !== "string") {
      return res
        .status(400)
        .json({ status: "failed", message: "查詢參數格式錯誤" });
    }

    const priceMin = minPrice === "" ? null : Number(minPrice);
    const priceMax = maxPrice === "" ? null : Number(maxPrice);
    if (
      (priceMin !== null && (!Number.isFinite(priceMin) || priceMin < 0)) ||
      (priceMax !== null && (!Number.isFinite(priceMax) || priceMax < 0)) ||
      (priceMin !== null && priceMax !== null && priceMin > priceMax)
    ) {
      res.status(400).json({
        status: "failed",
        message: "價格區間不正確",
      });
      return;
    }
    // 排序白名單
    const sortKey = String(sort || "")
      .trim()
      .toLowerCase();
    const sortMap = {
      created_at_desc: (qb) => qb.addOrderBy("p.created_at", "DESC"),

      price_asc: (qb) =>
        qb
          // 先選出一個「實際售價」欄位別名
          .addSelect("COALESCE(p.discount_price, p.price)", "effective_price")
          // 再用這個別名排序
          .addOrderBy("effective_price", "ASC")
          // 備援排序，價格相同時用上架時間
          .addOrderBy("p.created_at", "DESC"),

      price_desc: (qb) =>
        qb
          .addSelect("COALESCE(p.discount_price, p.price)", "effective_price")
          .addOrderBy("effective_price", "DESC")
          .addOrderBy("p.created_at", "DESC"),
    };

    const sortFn = sortMap[sortKey] || sortMap.created_at_desc;

    // 組 QueryBuilder
    const baseQB = dataSource
      .getRepository("Product")
      .createQueryBuilder("p")
      .leftJoinAndSelect("p.category", "c")
      .where("p.is_active = :active", { active: true });

    // 類別過濾（名稱或 ID）
    if (category.trim() !== "") {
      baseQB.andWhere("c.name = :categoryName", {
        categoryName: category.trim(),
      });
    }
    if (categoryId.trim() !== "") {
      baseQB.andWhere("c.id = :categoryId", { categoryId: categoryId.trim() });
    }

    // 關鍵字（name/description 模糊）
    if (keyword.trim() !== "") {
      baseQB.andWhere("(p.name ILIKE :kw OR p.description ILIKE :kw)", {
        kw: `%${keyword.trim()}%`,
      });
    }

    // 價格區間（以實際售價：優先折扣價，否則原價）
    if (priceMin !== null) {
      baseQB.andWhere("COALESCE(p.discount_price, p.price) >= :min", {
        min: priceMin,
      });
    }
    if (priceMax !== null) {
      baseQB.andWhere("COALESCE(p.discount_price, p.price) <= :max", {
        max: priceMax,
      });
    }

    // total：同條件、不要下 orderBy
    const total = await baseQB.clone().getCount();
    // 當頁資料：排序 + 分頁（不 join images）
    const rowsQB = baseQB
      .clone()
      .select([
        "p.id",
        "p.name",
        "p.price",
        "p.discount_price",
        "p.created_at",
        "c.id",
        "c.name",
      ]);

    rowsQB.orderBy();
    sortFn(rowsQB);
    // 分頁
    rowsQB.skip(skip).take(perPage);
    const rows = await rowsQB.getMany();

    const ids = rows.map((r) => r.id);
    if (ids.length === 0) {
      return res.status(200).json({
        status: "success",
        message: "查詢成功",
        data: {
          products: [],
          pagination: { page: pageToInt, limit: perPage, total },
        },
      });
    }

    // ─────────────────────────────────────────────────────────
    // 第二段：批量撈主圖（主圖優先，其次 sort_order）

    const imgRows = await dataSource
      .getRepository("ProductImage")
      .createQueryBuilder("img")
      .where("img.product_id IN (:...ids)", { ids })
      .orderBy("img.is_main", "DESC")
      .addOrderBy("img.sort_order", "ASC")
      .addOrderBy("img.id", "ASC") // 兜底，確保穩定
      .select([
        "img.product_id",
        "img.image_url",
        "img.is_main",
        "img.sort_order",
      ])
      .getMany();

    // 建主圖 map（每個 product 只留第一張）
    const mainImageMap = new Map(); // product_id -> image_url
    for (const img of imgRows) {
      if (!mainImageMap.has(img.product_id)) {
        mainImageMap.set(img.product_id, img.image_url);
      }
    }

    // 整形回傳（格式與你原本一致）
    const products = rows.map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      discount_price: p.discount_price,
      main_image: mainImageMap.get(p.id) || null,
      category: p.category
        ? { id: p.category.id, name: p.category.name }
        : null,
    }));

    return res.status(200).json({
      status: "success",
      message: "查詢成功",
      data: {
        products,
        pagination: { page: pageToInt, limit: perPage, total },
      },
    });
  } catch (error) {
    logger.error(`[Products] 查詢產品列表失敗: ${error.message}`);
    next(error);
  }
};

const getProductDetail = async (req, res, next) => {
  try {
    const { product_id: productId } = req.params;
    if (
      isNotValidString(productId) ||
      isUndefined(productId) ||
      isNotValidUUID(productId)
    ) {
      res.status(400).json({
        status: "failed",
        message: "欄位未填寫正確",
      });
      return;
    }
    //查主要欄位 + 分類
    const productDetail = await dataSource.getRepository("Product").findOne({
      where: { id: productId },
      relations: { category: true },
    });
    if (!productDetail) {
      res.status(404).json({
        status: "failed",
        message: "商品ID不存在",
      });
      return;
    }
    // 抓圖片、變體、標籤
    const [images, variants, productTags] = await Promise.all([
      dataSource.getRepository("ProductImage").find({
        where: { product: { id: productId } },
        order: { sort_order: "ASC" },
        select: ["image_url", "is_main", "sort_order"],
      }),
      dataSource.getRepository("ProductVariant").find({
        where: { product: { id: productId } },
        select: ["id", "option_name", "value", "stock"],
      }),
      dataSource.getRepository("ProductTag").find({
        where: { product: { id: productId } },
        relations: { tag: true },
        order: { sort_order: "ASC" },
      }),
    ]);

    // 只保留 Tag 物件（或想要的欄位）
    const tags = productTags.map((pt) => ({
      id: pt.tag.id,
      name: pt.tag.name,
    }));
    //組裝並回傳
    const responseData = {
      id: productDetail.id,
      name: productDetail.name,
      price: productDetail.price,
      discount_price: productDetail.discount_price,
      description: productDetail.description,
      category: {
        id: productDetail.category.id,
        name: productDetail.category.name,
        description: productDetail.category.description,
      },
      images,
      variants,
      tags,
      created_at: productDetail.created_at,
    };
    res.status(200).json({
      status: "success",
      message: "查詢成功",
      data: responseData,
    });
  } catch (error) {
    logger.error(`[ProductId] 查詢產品詳細失敗:${error.message}`);
    next(error);
  }
};

module.exports = {
  getProducts,
  getProductDetail,
};
