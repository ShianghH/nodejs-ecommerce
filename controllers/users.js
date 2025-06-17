const { dataSource } = require("../db/data-source");
const logger = require("../utils/logger")("UsersController"); // 建立 logger 實例，標記這份 log 是來自 Users
const config = require("../config/index"); // 引入自訂的設定管理器，集中管理 db/web/secret 等設定
const bcrypt = require("bcrypt"); // 引入 bcrypt 套件，用來加密密碼（雜湊處理）
const generateJWT = require("../utils/generateJWT"); // 引入自訂的 JWT 產生器，用來簽發登入後的 JSON Web Token
const passwordPattern = /(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,32}/; // 密碼格式規則：需包含至少一個數字、一個大寫、一個小寫，長度 8-32 字元

// Email 格式驗證規則：
// 必須包含帳號@網域，帳號允許英數字 + 特定符號，網域支援 .com / .org 等結尾
const emailPattern = /^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$/;
const {
  isUndefined,
  isNotValidString,
  isNotValidInteger,
} = require("../utils/validators");

//從 firebase-admin 引入 FCM 通知模組，用於發送推播訊息給裝置（Web/App）
const { messaging } = require("firebase-admin");

const postSignup = async (req, res, next) => {
  try {
    // 從請求主體中解構取得使用者輸入的 name、email、password 欄位
    const { name, email, password } = req.body;
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
    // 建立新的使用者實例（尚未儲存到資料庫）
    const newUser = userRepository.create({
      name,
      email,
      role: "USER",
      password: hashPassword,
    });
    // 將新使用者資料寫入資料庫，並取得包含 ID 的儲存結果
    const savedUser = await userRepository.save(newUser);
    // 輸出日誌：記錄成功建立使用者的 ID
    logger.info("新建立的使用者ID:", savedUser.id);
    res.status(200).json({
      status: "success",
      message: "註冊成功",
      date: {
        user: {
          id: savedUser.id,
          name: savedUser.name,
          email: savedUser.email,
          created_at: savedUser.created_at,
          updated_at: savedUser.updated_at,
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
    //  2. 檢查密碼是否符合規則
    if (!passwordPattern.test(password)) {
      logger.warn("[Signin] 密碼格式錯誤：不符合強度規則");
      res.status(400).json({
        status: "failed",
        message: "密碼需包含英文大小寫與數字，長度 8～32 字元",
      });
      return;
    }
    // 3. 查詢使用者是否存在,取得 users 資料表的 Repository，用來查詢或操作使用者資料
    const userRepository = dataSource.getRepository("User");
    // 查詢是否已有該 email 的使用者（只取 id、name、password 三個欄位）
    const existingUser = await userRepository.findOne({
      where: { email },
      select: ["id", "name", "password", "email"],
    });
    if (!existingUser) {
      logger.warn(`[Signin] 查無此帳號：${email}`);
      res.status(401).json({
        status: "failed",
        message: "使用者不存在或密碼輸入錯誤",
      });
      return;
    }
    // 輸出查詢到的使用者資料（用於 debug）
    logger.info(`使用者資料: ${JSON.stringify(existingUser)}`);
    // 比對使用者輸入的明文密碼與資料庫中加密後的密碼是否一致`
    const isMach = await bcrypt.compare(password, existingUser.password);
    if (!isMach) {
      logger.warn(`[Signin] 密碼比對失敗：${email}`);
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

module.exports = {
  postSignup,
  postSignin,
};
