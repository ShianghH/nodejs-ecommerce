const { dataSource } = require("../db/data-source");
const logger = require("../utils/logger")("FavoritesController");

const {
  isUndefined,
  isNotValidString,
  isNotValidInteger,
  isNotValidUUID,
  numberReg,
} = require("../utils/validators");

const postFavorites = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { product_id: productId } = req.body;
    if (
      isNotValidUUID(productId) ||
      isUndefined(productId) ||
      isNotValidString(productId)
    ) {
      res.status(400).json({
        status: "failed",
        message: "欄位格式錯誤",
      });
      return;
    }
    const product = await dataSource.getRepository("Product").findOne({
      where: {
        id: productId,
      },
    });
    if (!product) {
      logger.warn(`[Favorite] 查無此商品: ${productId}`);
      res.status(404).json({
        status: "failed",
        message: "查無商品",
      });
      return;
    }
    const favoriteRepo = dataSource.getRepository("FavoriteItem");
    const existing = await favoriteRepo.findOne({
      where: {
        user: { id: userId },
        product: { id: productId },
      },
    });
    if (existing) {
      res.status(409).json({
        status: "failed",
        message: "你已經收藏過這個商品",
      });
      return;
    }
    const newFavorite = favoriteRepo.create({
      user: { id: userId },
      product: { id: productId },
    });
    const saveFavorite = await favoriteRepo.save(newFavorite);
    res.status(201).json({
      status: "success",
      message: "加入收藏成功",
      data: {
        data: { product_id: productId },
      },
    });
  } catch (error) {
    logger.error(`[Favorites] 加入收藏失敗:`, error);
    next(error);
  }
};
const deleteFavorites = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { product_id: productId } = req.params;
    if (
      isNotValidUUID(productId) ||
      isUndefined(productId) ||
      isNotValidString(productId)
    ) {
      res.status(400).json({
        status: "failed",
        message: "欄位格式錯誤",
      });
      return;
    }
    const result = await dataSource.getRepository("FavoriteItem").delete({
      user: {
        id: userId,
      },
      product: {
        id: productId,
      },
    });
    if (result.affected === 0) {
      res.status(404).json({
        status: "failed",
        message: "找不到收藏紀錄",
      });
      return;
    }
    res.status(200).json({
      status: "success",
      message: "刪除成功",
    });
  } catch (error) {
    logger.warn(`[Favorite] 刪除收藏商品失敗`);
    next(error);
  }
};

const getFavorites = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const favoriteRepo = dataSource.getRepository("FavoriteItem");
    const favorites = await favoriteRepo.find({
      where: {
        user: { id: userId },
      },
      relations: {
        product: true,
      },
      order: { created_at: "DESC" },
    });
    const result = favorites.map((f) => {
      const product = f.product;
      return {
        id: f.id,
        product_id: f.product?.id,
        created_at: f.created_at,
      };
    });
    res.status(200).json({
      status: "success",
      message: "查詢成功",
      data: {
        favorites: result,
      },
    });
  } catch (error) {
    logger.warn(`[Favorites]:查詢收藏商品失敗`);
    next(error);
  }
};

module.exports = {
  postFavorites,
  deleteFavorites,
  getFavorites,
};
