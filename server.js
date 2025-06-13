const app = require("./app");
const { dataSource } = require("./db/data-source");

(async () => {
  try {
    await dataSource.initialize();
    console.log("[Database] 連線與初始化成功"); // <- 看到這行就代表 initialize 完成
  } catch (err) {
    console.error("[Database] 初始化失敗，錯誤原因：", err);
    process.exit(1); // 連線失敗就直接結束程式
  }

  // 如果 initialize 成功，再啟動 Express server
  const PORT = process.env.PORT || 5500;
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
})();
