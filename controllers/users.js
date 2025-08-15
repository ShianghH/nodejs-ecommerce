const { dataSource } = require("../db/data-source");
const logger = require("../utils/logger")("UsersController"); // 建立 logger 實例，標記這份 log 是來自 Users
const config = require("../config/index"); // 引入自訂的設定管理器，集中管理 db/web/secret 等設定

const bcrypt = require("bcrypt"); // 引入 bcrypt 套件，用來加密密碼（雜湊處理）
const generateJWT = require("../utils/generateJWT"); // 引入自訂的 JWT 產生器，用來簽發登入後的 JSON Web Token
const passwordPattern = /(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,32}/; // 密碼格式規則：需包含至少一個數字、一個大寫、一個小寫，長度 8-32 字元

// Email 格式驗證規則：
// 必須包含帳號@網域，帳號允許英數字 + 特定符號，網域支援 .com / .org 等結尾
const emailPattern = /^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$/;
const maskEmail = (e) => e.replace(/(^..).+(@.*$)/, "$1***$2");
const telReg = /^09\d{8}$/;

const {
  isUndefined,
  isNotValidString,
  isNotValidInteger,
} = require("../utils/validators");

//從 firebase-admin 引入 FCM 通知模組，用於發送推播訊息給裝置（Web/App）
// const { messaging } = require("firebase-admin");
// const { password } = require("../config/db");
// const { startTime } = require("pino-http");

const postSignup = async (req, res, next) => {
  try {
    // 從請求主體中解構取得使用者輸入的 name、email、password 欄位
    const { name, email, password } = req.body;
    const rawName = name; // 保留原變數以符合你現有驗證
    const nameTrimmed = rawName.trim();
    if (
      isUndefined(name) ||
      isNotValidString(name) ||
      name.trim().length > 10 ||
      name.trim().length < 2 ||
      isUndefined(email) ||
      isNotValidString(email) ||
      !emailPattern.test(email) ||
      isUndefined(password) ||
      isNotValidString(password)
    ) {
      logger.warn("欄位未填寫正確");
      res.status(400).json({
        status: "failed",
        message: "欄位未填寫正確",
      });
      return;
    }
    if (!passwordPattern.test(password)) {
      logger.warn(
        "建立使用者錯誤: 密碼不符合規則，需要包含英文數字大小寫，長度 8～32 字元"
      );
      res.status(400).json({
        status: "failed",
        message: "密碼不符合規則，需要包含英文數字大小寫，長度 8～32 字元",
      });
      return;
    }

    //取得對應 'users' entity 的資料存取物件（Repository）
    const userRepository = dataSource.getRepository("User");

    //查詢資料庫中是否已存在相同 email 的使用者（用於註冊驗證）
    const existingUser = await userRepository.findOne({
      where: { email },
    });
    if (existingUser) {
      logger.warn("建立使用者錯誤: Email 已被使用");
      res.status(409).json({
        status: "failed",
        message: "註冊失敗，Email 已被使用",
      });
      return;
    }
    // 產生 bcrypt 的 salt，用於加密密碼（強度 10）
    const salt = await bcrypt.genSalt(10);

    // 使用 bcrypt 將密碼加鹽後加密，產生安全的 hashed 密碼
    const hashPassword = await bcrypt.hash(password, salt);

    const roleRepository = dataSource.getRepository("UserRole");

    // 建立新的使用者實例（尚未儲存到資料庫）
    const newUser = userRepository.create({
      name: nameTrimmed,
      email,
      password: hashPassword,
    });
    // 將新使用者資料寫入資料庫，並取得包含 ID 的儲存結果
    const savedUser = await userRepository.save(newUser);
    await roleRepository.insert({
      user: savedUser,
      rolename: "user",
    });

    // 輸出日誌：記錄成功建立使用者的 ID
    logger.info(`新建立的使用者ID: ${savedUser.id}`);
    res.status(201).json({
      status: "success",
      message: "註冊成功",
      data: {
        user: {
          id: savedUser.id,
          name: savedUser.name,
          email: savedUser.email,
        },
      },
    });
  } catch (error) {
    logger.error("建立使用者錯誤:", error);
    next(error);
  }
};

const postSignin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    //  1. 檢查 Email 與密碼是否填寫正確
    if (
      isUndefined(email) ||
      isNotValidString(email) ||
      !emailPattern.test(email) ||
      isUndefined(password) ||
      isNotValidString(password)
    ) {
      logger.warn("[Signin] 欄位驗證失敗：Email 或密碼未填寫或格式錯誤");
      res.status(400).json({
        status: "failed",
        message: "請確認 Email 與密碼是否正確填寫",
      });
      return;
    }

    // 2. 查詢使用者是否存在,取得 users 資料表的 Repository，用來查詢或操作使用者資料
    const userRepository = dataSource.getRepository("User");
    // 查詢是否已有該 email 的使用者（只取 id、name、password 三個欄位）
    const existingUser = await userRepository.findOne({
      where: { email },
      select: ["id", "name", "password", "email"],
    });
    if (!existingUser) {
      logger.warn(`[Signin] 查無此帳號：${maskEmail(email)}`);
      res.status(401).json({
        status: "failed",
        message: "使用者不存在或密碼輸入錯誤",
      });
      return;
    }
    // 輸出查詢到的使用者資料（用於 debug）
    logger.info(
      { user_id: existingUser.id, email: maskEmail(existingUser.email) },
      "[Signin] 找到帳號，準備比對密碼"
    );
    // 比對使用者輸入的明文密碼與資料庫中加密後的密碼是否一致`
    const isMach = await bcrypt.compare(password, existingUser.password);
    if (!isMach) {
      logger.warn(`[Signin] 查無此帳號：${maskEmail(email)}`);
      res.status(401).json({
        status: "failed",
        message: "使用者不存在或密碼輸入錯誤",
      });
      return;
    }
    // 產生 JWT（JSON Web Token）作為登入憑證
    const token = await generateJWT(
      {
        id: existingUser.id, // 放入要簽名的 payload（通常是 user id）
      },
      config.get("secret.jwtSecret"), // 簽名用的密鑰（從設定檔中讀取）
      {
        // token 有效期限，例如 '7d'
        expiresIn: `${config.get("secret.jwtExpiresDay")}`,
      }
    );
    res.status(200).json({
      status: "success",
      message: "登入成功",
      token,
      data: {
        user: {
          id: existingUser.id,
          name: existingUser.name,
          email: existingUser.email,
        },
      },
    });
  } catch (error) {
    logger.error("[Signin] 登入錯誤：", error);
    next(error);
  }
};

const patchPassword = async (req, res, next) => {
  try {
    const { id } = req.user;
    const { password, newPassword, confirmNewPassword } = req.body;

    logger.info(`[PATCH /users/password] 使用者 ${id} 嘗試修改密碼`);
    //欄位驗證
    if (
      isUndefined(password) ||
      isNotValidString(password) ||
      isUndefined(newPassword) ||
      isNotValidString(newPassword) ||
      isUndefined(confirmNewPassword) ||
      isNotValidString(confirmNewPassword)
    ) {
      logger.warn(`[PATCH /users/password] 欄位未填寫正確 - user: ${id}`);
      res.status(400).json({
        status: "failed",
        message: "欄位未填寫正確",
      });
      return;
    }
    if (
      !passwordPattern.test(password) ||
      !passwordPattern.test(newPassword) ||
      !passwordPattern.test(confirmNewPassword)
    ) {
      logger.warn("密碼不符合規則，需要包含英文數字大小寫，長度 8～32 字元");
      res.status(400).json({
        status: "failed",
        message: "密碼不符合規則，需要包含英文數字大小寫，長度 8～32 字元",
      });
      return;
    }
    if (newPassword === password) {
      logger.warn("新密碼不能與舊密碼相同");
      res.status(400).json({
        status: "failed",
        message: "新密碼不能與舊密碼相同",
      });
      return;
    }
    if (newPassword !== confirmNewPassword) {
      logger.warn("新密碼與驗證新密碼不一致");
      res.status(400).json({
        status: "failed",
        message: "新密碼與驗證新密碼不一致",
      });
      return;
    }

    const userRepository = dataSource.getRepository("User");
    const existingUser = await userRepository.findOne({
      select: ["password"],
      where: { id },
    });
    const isMatch = await bcrypt.compare(password, existingUser.password);
    if (!isMatch) {
      logger.warn(`[Signin] 密碼比對失敗：${maskEmail(email)}`);
      res.status(400).json({
        status: "failed",
        message: "密碼輸入錯誤",
      });
      return;
    }
    const salt = await bcrypt.genSalt(10);
    const hashPassword = await bcrypt.hash(newPassword, salt);
    const updatedResult = await userRepository.update(
      { id },
      { password: hashPassword }
    );
    if (updatedResult.affected === 0) {
      logger.error(`[PATCH /users/password] 更新失敗 - user: ${id}`);
      res.status(400).json({
        status: "failed",
        message: "密碼更新失敗",
      });
      return;
    }
    logger.info(`[PATCH /users/password] 密碼修改成功 - user: ${id}`);
    res.status(200).json({
      status: "success",
      message: "密碼已成功修改",
    });
  } catch (error) {
    logger.error(`[PATCH /users/password] 發生錯誤：${error.message}`);
    next(error);
  }
};

const patchProfile = async (req, res, next) => {
  try {
    const { id } = req.user;
    const { tel, address } = req.body;
    logger.info(`[PATCH /users/profile] 使用者 ${id} 嘗試修改個人資料`);
    //驗證空值
    if (isUndefined(tel) && isUndefined(address)) {
      logger.warn(`[PATCH /users/profile] 沒有提供任何欄位 - user: ${id}`);
      res.status(400).json({
        status: "failed",
        message: "請至少提供電話或地址",
      });
      return;
    }
    //如tel有值 驗證格式
    if (!isUndefined(tel)) {
      if (isNotValidString(tel) || !telReg.test(tel)) {
        logger.warn(`[PATCH /users/profile] 欄位格式錯誤 - user: ${id}`);
        res.status(400).json({
          status: "failed",
          message: "欄位格式錯誤",
        });
        return;
      }
    }
    // 地址格式驗證（僅驗證為非空字串）
    if (!isUndefined(address)) {
      if (isNotValidString(address)) {
        logger.warn(`[PATCH /users/profile] 欄位格式錯誤 - user: ${id}`);
        res.status(400).json({
          status: "failed",
          message: "欄位格式錯誤",
        });
        return;
      }
    }
    const userRepository = dataSource.getRepository("User");
    // 只更新有提供的欄位，避免把沒傳的欄位寫成 null/undefined
    const updateFields = {};
    if (!isUndefined(tel)) updateFields.tel = tel;
    if (!isUndefined(address)) updateFields.address = address;
    const updateData = await userRepository.update({ id }, updateFields);
    if (updateData.affected === 0) {
      logger.error(`[PATCH /users/profile] 資料更新失敗 - user: ${id}`);
      res.status(400).json({
        status: "failed",
        message: "資料更新失敗",
      });
      return;
    }
    logger.info(`[PATCH /users/profile] 使用者 ${id} 資料更新成功`);
    res.status(200).json({
      status: "success",
      message: "資料更新成功",
    });
  } catch (error) {
    logger.error(error);
    next(error);
  }
};

const getProfile = async (req, res, next) => {
  try {
    const { id } = req.user;
    logger.info(`[GET /users/profile] 使用者 ${id} 查詢資料`);
    const userRepository = dataSource.getRepository("User");
    const user = await userRepository.findOne({
      select: ["name", "email", "tel", "address"],
      where: { id },
    });
    res.status(200).json({
      status: "success",
      message: "查詢成功",
      data: {
        user,
      },
    });
  } catch (error) {
    logger.error("取得使用者資料錯誤:", error);
    next(error);
  }
};

const postApplyAdmin = async (req, res, next) => {
  try {
    const user = req.user;
    const roleRepository = dataSource.getRepository("UserRole");

    //檢查是否已經是 seller
    const existingSellerRole = await roleRepository.findOne({
      where: {
        user: { id: user.id },
        rolename: "admin",
      },
    });
    if (existingSellerRole) {
      res.status(409).json({
        status: "failed",
        message: "身分已建立，無須重複申請",
      });
      return;
    }
    const result = await roleRepository.insert({
      user,
      rolename: "admin",
    });
    logger.info(`使用者 ${user.email} 成功成為管理員`, result);
    res.status(201).json({
      status: "success",
      message: "你現在已經是管理員啦！請小心使用權限",
    });
  } catch (error) {
    logger.error("申請成為管理員時發生錯誤:", error);
    next(error);
  }
};

module.exports = {
  postSignup,
  postSignin,
  patchPassword,
  patchProfile,
  getProfile,
  postApplyAdmin,
};
