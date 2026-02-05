const express = require("express");
const db = require("../db");
const { classifyAiItem, getDefaultSourceUrls } = require("../services/ai");
const { buildDigestText } = require("../services/digest");
const { sendDigestByChannel } = require("../services/push");
const { requireAuth } = require("../utils/auth");
const { refreshAll, refreshTrendingIfStale, refreshAiFeeds, refreshSkillsIfStale } = require("../services/refresh");

const router = express.Router();

router.get("/health", (req, res) => {
  res.json({ code: 200, msg: "ok" });
});

function getLatestSnapshotDate(offset = 0) {
  const rows = db
    .prepare("SELECT DISTINCT snapshot_date FROM trending_repos ORDER BY snapshot_date DESC")
    .all();
  return rows[offset]?.snapshot_date || rows[0]?.snapshot_date || null;
}

function buildSearchClause({ q, language }) {
  const clauses = [];
  const params = [];
  if (language) {
    clauses.push("language = ?");
    params.push(language);
  }
  if (q) {
    clauses.push("(owner LIKE ? OR name LIKE ? OR description LIKE ?)");
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  return { clause: clauses.length ? `AND ${clauses.join(" AND ")}` : "", params };
}

router.get("/trending", (req, res) => {
  const language = (req.query.language || "").trim();
  const q = (req.query.q || "").trim();
  const period = req.query.period || "weekly";
  const limit = req.query.limit || "20";
  const queryLimit = Math.min(parseInt(limit, 10) || 20, 100);
  const { clause, params } = buildSearchClause({ q, language });

  if (period === "monthly") {
    const fromDate = db.prepare("SELECT date('now', '-30 day') AS date").get().date;
    const list = db
      .prepare(
        `SELECT owner, name, url, description, language,
                MAX(stars) AS stars,
                MAX(forks) AS forks,
                SUM(stars_delta) AS stars_delta,
                MAX(snapshot_date) AS snapshot_date
         FROM trending_repos
         WHERE snapshot_date >= ? ${clause}
         GROUP BY owner, name, url, description, language
         ORDER BY stars_delta DESC, stars DESC
         LIMIT ?`
      )
      .all(fromDate, ...params, queryLimit);
    return res.json({ code: 200, msg: "success", data: { list } });
  }

  const snapshotDate = period === "lastweek" ? getLatestSnapshotDate(1) : getLatestSnapshotDate(0);
  if (!snapshotDate) {
    return res.json({ code: 200, msg: "success", data: { list: [] } });
  }
  const list = db
    .prepare(
      `SELECT * FROM trending_repos
       WHERE snapshot_date = ? ${clause}
       ORDER BY stars_delta DESC, stars DESC
       LIMIT ?`
    )
    .all(snapshotDate, ...params, queryLimit);
  return res.json({ code: 200, msg: "success", data: { list } });
});

router.get("/weekly", (req, res) => {
  const language = (req.query.language || "").trim();
  const q = (req.query.q || "").trim();
  const limit = req.query.limit || "6";
  const queryLimit = Math.min(parseInt(limit, 10) || 6, 50);
  const snapshotDate = getLatestSnapshotDate(0);
  if (!snapshotDate) {
    return res.json({ code: 200, msg: "success", data: { list: [] } });
  }
  const { clause, params } = buildSearchClause({ q, language });
  const list = db
    .prepare(
      `SELECT * FROM trending_repos
       WHERE snapshot_date = ? ${clause}
       ORDER BY stars_delta DESC, stars DESC
       LIMIT ?`
    )
    .all(snapshotDate, ...params, queryLimit);
  return res.json({ code: 200, msg: "success", data: { list } });
});

router.get("/ai", (req, res) => {
  const q = (req.query.q || "").trim();
  const category = req.query.category || "all";
  const limit = req.query.limit || "20";
  const queryLimit = Math.min(parseInt(limit, 10) || 20, 100);
  const clauses = [];
  const params = [];
  const sourceUrls = getDefaultSourceUrls();
  if (!sourceUrls.length) {
    return res.json({ code: 200, msg: "success", data: { list: [] } });
  }
  const placeholders = sourceUrls.map(() => "?").join(", ");
  clauses.push(`source_url IN (${placeholders})`);
  params.push(...sourceUrls);
  if (q) {
    clauses.push("(title LIKE ? OR summary LIKE ? OR source LIKE ?)");
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  const clause = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const rows = db
    .prepare(
      `SELECT * FROM ai_items ${clause}
       ORDER BY datetime(published_at) DESC, id DESC
       LIMIT ?`
    )
    .all(...params, queryLimit * 2);

  const list = rows.filter((item) => {
    if (category === "all") return true;
    const tag = classifyAiItem(item);
    if (category === "research") return tag === "research";
    if (category === "product") return tag === "product";
    if (category === "opensource") return tag === "opensource";
    return true;
  }).slice(0, queryLimit);

  return res.json({ code: 200, msg: "success", data: { list } });
});

router.get("/skills", (req, res) => {
  const listType = (req.query.list || "trending").trim().toLowerCase();
  const q = (req.query.q || "").trim();
  const limit = req.query.limit || "20";
  const queryLimit = Math.min(parseInt(limit, 10) || 20, 100);
  const allowed = new Set(["trending", "hot", "all_time"]);
  const normalizedType = allowed.has(listType) ? listType : "trending";

  const clauses = ["list_type = ?"];
  const params = [normalizedType];
  if (q) {
    clauses.push("(name LIKE ? OR source LIKE ? OR skill_id LIKE ?)");
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  const whereClause = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const rows = db
    .prepare(
      `SELECT * FROM skills_items ${whereClause}
       ORDER BY rank ASC
       LIMIT ?`
    )
    .all(...params, queryLimit);

  const totalRow = db
    .prepare(`SELECT COUNT(*) AS total FROM skills_items ${whereClause}`)
    .get(...params);

  const snapshot = db
    .prepare("SELECT MAX(snapshot_date) AS date FROM skills_items WHERE list_type = ?")
    .get(normalizedType);

  const list = rows.map((item) => {
    const source = item.source || "";
    const skillId = item.skill_id || "";
    return {
      ...item,
      skill_url: source && skillId ? `https://skills.sh/${source}/${skillId}` : null,
      repo_url: source ? `https://github.com/${source}` : null,
    };
  });

  return res.json({
    code: 200,
    msg: "success",
    data: {
      list,
      list_type: normalizedType,
      snapshot_date: snapshot?.date || null,
      total: totalRow?.total || list.length,
      source: "skills.sh",
    },
  });
});

router.get("/digest/preview", async (req, res) => {
  const topicsParam = (req.query.topics || "").trim();
  const keywords = (req.query.keywords || "").trim();
  const topics = topicsParam
    ? topicsParam.split(",").map((item) => item.trim()).filter(Boolean)
    : ["weekly", "ai"];

  try {
    await refreshTrendingIfStale(360);
    await refreshAiFeeds({ reason: "manual" });
    await refreshSkillsIfStale(360);
  } catch (error) {
    console.warn("预览生成前刷新失败:", error.message);
  }

  const text = await buildDigestText({ topics, keywords });
  return res.json({ code: 200, msg: "success", data: { text } });
});

router.post("/digest/send", requireAuth, async (req, res) => {
  const userId = req.user.id;
  const schedule = db.prepare("SELECT * FROM push_schedule WHERE user_id = ?").get(userId);
  let contentConfig = {};
  if (schedule && schedule.content_json) {
    try {
      contentConfig = JSON.parse(schedule.content_json);
    } catch (error) {
      contentConfig = {};
    }
  }
  const channels = db
    .prepare("SELECT * FROM push_channels WHERE user_id = ? AND active = 1")
    .all(userId);
  if (!channels.length) {
    return res.status(400).json({ code: 400, msg: "请先绑定推送通道" });
  }

  try {
    await refreshTrendingIfStale(360);
    await refreshAiFeeds({ reason: "manual" });
    await refreshSkillsIfStale(360);
  } catch (error) {
    console.warn("手动推送前刷新失败:", error.message);
  }
  const text = await buildDigestText({ ...contentConfig, userId });
  const results = [];
  for (const channel of channels) {
    try {
      const result = await sendDigestByChannel(channel, contentConfig, { userId });
      results.push({ channel: channel.type, status: "success", result });
      db.prepare("INSERT INTO push_logs (user_id, channel_id, status, detail) VALUES (?, ?, ?, ?)")
        .run(userId, channel.id, "manual", "手动触发");
    } catch (error) {
      results.push({ channel: channel.type, status: "failed", error: error.message });
      db.prepare("INSERT INTO push_logs (user_id, channel_id, status, detail) VALUES (?, ?, ?, ?)")
        .run(userId, channel.id, "failed", error.message);
    }
  }
  return res.json({ code: 200, msg: "success", data: { text, results } });
});

router.post("/admin/refresh", async (req, res) => {
  const adminToken = req.headers["x-admin-token"];
  if (!process.env.ADMIN_TOKEN || adminToken !== process.env.ADMIN_TOKEN) {
    return res.status(403).json({ code: 403, msg: "无权限" });
  }
  const result = await refreshAll({ reason: "manual" });
  return res.json({ code: 200, msg: "刷新完成", data: result });
});

module.exports = router;
