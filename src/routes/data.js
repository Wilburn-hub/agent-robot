const express = require("express");
const { fetchGitHubTrending, getLatestTrending } = require("../services/github");
const { fetchAiFeeds, getLatestAi } = require("../services/ai");

const router = express.Router();

router.get("/health", (req, res) => {
  res.json({ code: 200, msg: "ok" });
});

router.get("/trending", (req, res) => {
  const list = getLatestTrending();
  res.json({ code: 200, msg: "success", data: { list } });
});

router.get("/weekly", (req, res) => {
  const list = getLatestTrending();
  res.json({ code: 200, msg: "success", data: { list } });
});

router.get("/ai", (req, res) => {
  const list = getLatestAi(20);
  res.json({ code: 200, msg: "success", data: { list } });
});

router.post("/admin/refresh", async (req, res) => {
  const adminToken = req.headers["x-admin-token"];
  if (!process.env.ADMIN_TOKEN || adminToken !== process.env.ADMIN_TOKEN) {
    return res.status(403).json({ code: 403, msg: "无权限" });
  }
  await fetchGitHubTrending();
  await fetchAiFeeds();
  return res.json({ code: 200, msg: "刷新完成" });
});

module.exports = router;
