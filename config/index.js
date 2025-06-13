const dotenv = require("dotenv"); //載入 dotenv，用來讀取 .env 環境變數檔案

// 本地開發使用 .env，Render 則靠環境變數，不讀檔
const result = dotenv.config();

if (result.error && !process.env.RENDER) {
  console.error("[dotenv] ❌ 無法讀取 .env：", result.error);
  throw result.error;
}

// // 載入自訂的三個設定檔：資料庫設定、網站設定、機密資料
const db = require("./db");
const web = require("./web");
const secret = require("./secret");

// // 如果 dotenv 載入失敗，就直接拋出錯誤，讓程式停止
// if (result.error) {
//   throw result.error;
// }
// 將所有設定集合成一個物件，供後續使用
const config = {
  db,
  web,
  secret,
};

// 建立一個設定管理器，提供統一的方式存取設定值
class ConfigManager {
  /**
   * Retrieves a configuration value based on the provided dot-separated path.
   * Throws an error if the specified configuration path is not found.
   *
   * @param {string} path - Dot-separated string representing the configuration path.
   * @returns {*} - The configuration value corresponding to the given path.
   * @throws Will throw an error if the configuration path is not found.
   */
  // 檢查 path 是否為字串
  static get(path) {
    if (!path || typeof path !== "string") {
      throw new Error(`incorrect path: ${path}`);
    }
    // 拆解成每層 key，例如 'db.host' => ['db', 'host']
    const keys = path.split(".");
    let configValue = config;
    // 遞迴尋找每層設定
    keys.forEach((key) => {
      if (!Object.prototype.hasOwnProperty.call(configValue, key)) {
        throw new Error(`config ${path} not found`);
      }
      configValue = configValue[key];
    });
    // 回傳找到的設定值
    return configValue;
  }
}

// 匯出 ConfigManager 給其他模組使用
module.exports = ConfigManager;
