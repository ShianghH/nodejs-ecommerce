const express = require("express");
const cors = require("cors");
const path = require("path");
const pinoHttp = require("pino-http");

console.log("[Render][app] 基本套件載入完成");

const logger = require("./utils/logger")("App");

const usersRouter = require("./routes/users");

console.log("[Render][app] 所有 routes 載入完成");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

console.log("[Render][app] middleware 載入中...");

app.use(
  pinoHttp({
    logger,
    // serializers: {
    //   req(req) {
    //     req.body = req.raw.body;
    //     return req;
    //   },
    // },
  })
);
console.log("[Render][app] logger middleware 載入完成");

app.use(express.static(path.join(__dirname, "public")));

app.get("/healthcheck", (req, res) => {
  res.status(200);
  res.send("OK");
});

app.use("/api/v1/users", usersRouter);

console.log("[Render][app] 所有 API route 註冊完成");

//全域錯誤處理 middleware
app.use((err, req, res, next) => {
  req.log.error(err);
  if (err.status) {
    res.status(err.status).json({
      message: err.message,
    });
    return;
  }
  res.status(500).json({
    message: "伺服器錯誤，請稍後再試",
  });
});

console.log("[Render][app] app.js 結尾");

module.exports = app;
