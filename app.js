const express = require("express");
const cors = require("cors");
const path = require("path");
const pinoHttp = require("pino-http");

console.log("[Render][app] 基本套件載入完成");

const logger = require("./utils/logger")("App");

const usersRouter = require("./routes/users");
const adminRouter = require("./routes/admin");
const productsRouter = require("./routes/products");
const categoryRouter = require("./routes/category");
const ordersRouter = require("./routes/orders");
const favoritesRouter = require("./routes/favorites");
const cartRouter = require("./routes/cart");
const tagsRouter = require("./routes/tags");
const reportRouter = require("./routes/report");
const paymentmethodsRouter = require("./routes/paymentmethods");

console.log("[Render][app] 所有 routes 載入完成");

const app = express();

//  1. 先掛 logger（確保 req.log 永遠有）
app.use(
  pinoHttp({
    logger,
    redact: {
      paths: [
        "req.headers.authorization",
        "req.body.password",
        "req.body.newPassword",
        "req.body.confirmNewPassword",
        "res.body.token",
      ],
      remove: true,
    },
  })
);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

//  2.加入 JSON parse error 攔截器
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && "body" in err) {
    if (req && req.log && typeof req.log.warn === "function") {
      req.log.warn(err, "[App] JSON parse error");
    } else {
      logger.warn(err, "[App] JSON parse error");
    }

    return res.status(400).json({
      status: "failed",
      message: "JSON 格式錯誤，請檢查引號、逗號與值是否正確",
    });
  }
  next(err);
});
console.log("[Render][app] middleware 載入完成");

app.use(express.static(path.join(__dirname, "public")));

app.get("/healthcheck", (req, res) => {
  res.status(200);
  res.send("OK");
});
// 3. 掛上所有 routes
app.use("/api/v1/users", usersRouter);
app.use("/api/v1/admin", adminRouter);
app.use("/api/v1/products", productsRouter);
app.use("/api/v1/category", categoryRouter);
app.use("/api/v1/orders", ordersRouter);
app.use("/api/v1/favorites", favoritesRouter);
app.use("/api/v1/cart", cartRouter);
app.use("/api/v1/admin/tags", tagsRouter);
app.use("/api/v1/admin/report", reportRouter);
app.use("/api/v1/payment_methods", paymentmethodsRouter);

console.log("[Render][app] 所有 API route 註冊完成");

// 4: 404 預設處理
app.use((req, res) => {
  res.status(404).json({ status: "failed", message: "Not Found" });
});

//5. 全域錯誤處理 middleware
app.use((err, req, res, next) => {
  let log;
  if (req && req.log && typeof req.log.error === "function") {
    log = req.log;
  } else {
    log = logger; // fallback
  }

  const status = err.statusCode || err.status || 500;
  const message = err.expose ? err.message : "Internal Server Error";

  // 雙保險：就算上面的 JSON 攔截器漏接，也優雅回 400
  if (err instanceof SyntaxError && "body" in err) {
    log.warn(err, "[App] JSON parse error (caught in error handler)");
    return res.status(400).json({
      status: "failed",
      message: "JSON 格式錯誤，請檢查引號、逗號與值是否正確",
    });
  }

  log.error(err);
  return res.status(status).json({ status: "failed", message });
});
console.log("[Render][app] app.js 結尾");

module.exports = app;
