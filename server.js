const fs = require("fs");
require("dotenv").config();

// 全局错误日志
process.on("unhandledRejection", (reason, promise) => {
  const log = \`[\${new Date().toISOString()}] Unhandled Rejection at: \${promise}, reason: \${reason}\\n\`;
  fs.appendFileSync("server_error.log", log);
  console.error(log);
});
process.on("uncaughtException", (err) => {
  const log = \`[\${new Date().toISOString()}] Uncaught Exception: \${err.stack || err}\\n\`;
  fs.appendFileSync("server_error.log", log);
  console.error(log);
  process.exit(1);
});

const express = require("express");
const session = require("express-session");
const path = require("path");
const { startScheduler } = require("./src/jobs/scheduler");
const authRouter = require("./src/routes/auth");
const dataRouter = require("./src/routes/data");
const settingsRouter = require("./src/routes/settings");
const { fetchGitHubTrending } = require("./src/services/github");
const { fetchAiFeedsForAllUsers } = require("./src/services/ai");

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
    await fetchGitHubTrending();
    await fetchAiFeedsForAllUsers();
  } catch (error) {
    console.error("初始化数据抓取失败:", error.message);
  }
}

bootstrap();
