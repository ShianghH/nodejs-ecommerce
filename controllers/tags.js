const { dataSource } = require("../db/data-source");
const logger = require("../utils/logger")("TagsController");

const {
  isUndefined,
  isNotValidString,
  isNotValidInteger,
  isNotValidUUID,
  numberReg,
} = require("../utils/validators");

const getTags = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const pageToInt = parseInt(page, 10);
    const limitToInt = parseInt(limit, 10);
    const skip = (pageToInt - 1) * limitToInt;

    if (
      !numberReg.test(page) ||
      pageToInt < 1 ||
      !numberReg.test(limit) ||
      limit < 1
    ) {
      logger.warn("[Admin][Tags]分類參數錯誤");
      res.status(400).json({
        status: "failed",
        message: "查詢參數格式錯誤",
      });
      return;
    }
    const [tags, total] = await dataSource.getRepository("Tag").findAndCount({
      select: ["id", "name", "created_at", "updated_at"],
      order: { created_at: "DESC" },
      skip,
      take: limitToInt,
    });
    res.status(200).json({
      status: "success",
      message: "查詢成功",
      data: {
        tags,
        pagination: {
          page: pageToInt,
          limit: limitToInt,
          total,
        },
      },
    });
  } catch (error) {
    logger.warn(`[Tags]:取的標籤失敗`);
    next(error);
  }
};

const patchTags = async (req, res, next) => {
  try {
    const { tag_id: tagId } = req.params;
    const { name } = req.body;
    if (
      isNotValidUUID(tagId) ||
      isUndefined(tagId) ||
      isNotValidString(tagId)
    ) {
      res.status(404).json({
        status: "failed",
        message: "標籤ID格式錯誤",
      });
      return;
    }
    if (
      isUndefined(name) ||
      isNotValidString(name) ||
      name.trim().length < 1 ||
      name.trim().length > 100
    ) {
      res.status(400).json({
        status: "failed",
        message: "欄位格式錯誤",
      });
      return;
    }
    const tagRepo = dataSource.getRepository("Tag");
    const existing = await tagRepo.findOne({
      where: {
        id: tagId,
      },
    });
    if (!existing) {
      res.status(404).json({
        status: "failed",
        message: "標籤不存在",
      });
      return;
    }
    // 4) 重名檢查（只有當 name 有改變時）
    if (name !== existing.name) {
      const dup = await tagRepo.findOne({ where: { name } });
      if (dup && dup.id !== tagId) {
        res.status(409).json({
          status: "failed",
          message: "標籤名稱已被使用",
        });
        return;
      }
    }
    //進行更新
    existing.name = name;
    const updated = await tagRepo.save(existing);
    res.status(200).json({
      status: "success",
      message: "標籤更新成功",
      data: {
        tag: {
          id: updated.id,
          name: updated.name,
          updated: updated.updated_at,
        },
      },
    });
  } catch (error) {
    logger.warn(`[Tags]編輯標籤失敗:${error.message}`);
    next(error);
  }
};
const deleteTags = async (req, res, next) => {
  try {
    const { tag_id: tagId } = req.params;
    if (
      isUndefined(tagId) ||
      isNotValidUUID(tagId) ||
      isNotValidString(tagId)
    ) {
      res.status(400).json({
        status: "failed",
        message: "欄位格式錯誤",
      });
      return;
    }
    const tagRepo = dataSource.getRepository("Tag");
    const existing = await tagRepo.findOne({
      where: { id: tagId },
    });
    if (!existing) {
      res.status(404).json({
        status: "failed",
        message: "標籤不存在",
      });
      return;
    }
    const productTagRepo = dataSource.getRepository("ProductTag");
    const isUse = await productTagRepo.exists({
      where: {
        tag: { id: tagId },
      },
    });
    if (isUse) {
      res.status(409).json({
        status: "failed",
        message: "此標籤仍被商品使用，無法刪除",
      });
      return;
    }
    await tagRepo.delete(tagId);
    logger.info(`[Tags] 刪除成功 tag_id=${tagId}`);
    res.status(200).json({
      status: "success",
      message: "標籤刪除成功",
    });
  } catch (error) {
    logger.warn(`[Tags]刪除標籤失敗:${error.message}`);
    next(error);
  }
};

module.exports = {
  getTags,
  deleteTags,
  patchTags,
};
