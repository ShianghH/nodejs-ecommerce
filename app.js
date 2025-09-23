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
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

console.log("[Render][app] middleware 載入中...");

app.use(
  pinoHttp({
    logger,
    redact: {
      paths: [
        "req.headers.authorization", // JWT 或 API Token
        "req.body.password", // 使用者密碼
        "req.body.newPassword", // 新密碼
        "req.body.confirmNewPassword", // 確認密碼
        "res.body.token", // 回應中的 JWT Token
      ],
      remove: true, // true 代表整個欄位移除；false 代表改成 [Redacted]
    },
  })
);
console.log("[Render][app] logger middleware 載入完成");

app.use(express.static(path.join(__dirname, "public")));

app.get("/healthcheck", (req, res) => {
  res.status(200);
  res.send("OK");
});

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

//全域錯誤處理 middleware
app.use((err, req, res, next) => {
  const status = err.statusCode || err.status || 500;
  const message = err.message || "Internal Server Error";
  req.log.error(err);
  res.status(status).json({ status: "failed", message });
});

console.log("[Render][app] app.js 結尾");

module.exports = app;
