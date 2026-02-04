const fs = require("fs");
require("dotenv").config();

// 全局错误日志
process.on("unhandledRejection", (reason, promise) => {
  const log = `[${new Date().toISOString()}] Unhandled Rejection at: ${promise}, reason: ${reason}\n`;
  fs.appendFileSync("server_error.log", log);
  console.error(log);
});
process.on("uncaughtException", (err) => {
  const log = `[${new Date().toISOString()}] Uncaught Exception: ${err.stack || err}\n`;
  fs.appendFileSync("server_error.log", log);
  console.error(log);
  process.exit(1);
});

const express = require("express");
const session = require("express-session");
const axios = require("axios");
const path = require("path");

// 设置全局网络请求超时
axios.defaults.timeout = 30000;
const { startScheduler } = require("./src/jobs/scheduler");
const authRouter = require("./src/routes/auth");
const dataRouter = require("./src/routes/data");
const settingsRouter = require("./src/routes/settings");
const adminRouter = require("./src/routes/admin");
const { refreshAll } = require("./src/services/refresh");

const app = express();

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev-session-secret",
    resave: false,
    saveUninitialized: false,
  })
);

app.use("/api/auth", authRouter);
app.use("/api", dataRouter);
app.use("/api", settingsRouter);
app.use("/api/admin", adminRouter);

app.use(express.static(path.join(__dirname, "public")));

app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

startScheduler();

async function bootstrap() {
  try {
    await refreshAll({ reason: "bootstrap" });
  } catch (error) {
    console.error("初始化数据抓取失败:", error.message);
  }
}

bootstrap();
