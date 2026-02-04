const express = require("express");
const db = require("../db");
const { requireAuth } = require("../utils/auth");
const { sendDigestByChannel } = require("../services/push");
const { fetchAiFeedsForUser, defaultFeeds } = require("../services/ai");

const router = express.Router();

function getUserChannels(userId) {
  return db.prepare("SELECT * FROM push_channels WHERE user_id = ? ORDER BY id DESC").all(userId);
}

function getUserSources(userId) {
  return db.prepare("SELECT * FROM ai_sources WHERE user_id = ? ORDER BY id DESC").all(userId);
}

router.get("/settings", requireAuth, (req, res) => {
  let schedule = db.prepare("SELECT * FROM push_schedule WHERE user_id = ?").get(req.user.id);
  if (!schedule) {
    db.prepare("INSERT INTO push_schedule (user_id) VALUES (?)").run(req.user.id);
    schedule = db.prepare("SELECT * FROM push_schedule WHERE user_id = ?").get(req.user.id);
  }
  const channels = getUserChannels(req.user.id);
  const sources = getUserSources(req.user.id);
  return res.json({ code: 200, msg: "success", data: { schedule, channels, sources, defaultSources: defaultFeeds } });
});

router.put("/settings", requireAuth, (req, res) => {
  const { time, timezone, frequency, content } = req.body;
  const contentJson = content ? JSON.stringify(content) : null;
  const result = db.prepare(
    "UPDATE push_schedule SET time = ?, timezone = ?, frequency = ?, content_json = ?, updated_at = datetime('now') WHERE user_id = ?"
  ).run(time || "08:30", timezone || "Asia/Shanghai", frequency || "daily", contentJson, req.user.id);
  if (result.changes === 0) {
    db.prepare(
      "INSERT INTO push_schedule (user_id, time, timezone, frequency, content_json) VALUES (?, ?, ?, ?, ?)"
    ).run(req.user.id, time || "08:30", timezone || "Asia/Shanghai", frequency || "daily", contentJson);
  }

  return res.json({ code: 200, msg: "success" });
});

router.put("/sources", requireAuth, (req, res) => {
  const sources = Array.isArray(req.body.sources) ? req.body.sources : [];
  const normalized = sources
    .map((item) => {
      const url = (item.url || "").trim();
      if (!url) return null;
      const typeRaw = (item.type || "rss").trim().toLowerCase();
      return {
        type: typeRaw === "rss" ? "rss" : "rss",
        name: (item.name || "").trim(),
        url,
        active: item.active ? 1 : 0,
      };
    })
    .filter(Boolean);

  const removeStmt = db.prepare("DELETE FROM ai_sources WHERE user_id = ?");
  const insertStmt = db.prepare(
    "INSERT OR REPLACE INTO ai_sources (user_id, type, name, url, active) VALUES (?, ?, ?, ?, ?)"
  );
  const tx = db.transaction((rows) => {
    removeStmt.run(req.user.id);
    rows.forEach((row) => {
      insertStmt.run(req.user.id, row.type, row.name, row.url, row.active);
    });
  });
  tx(normalized);

  return res.json({ code: 200, msg: "success", data: { count: normalized.length } });
});

router.post("/channels/wecom", requireAuth, (req, res) => {
  const { name, webhook, active = 1 } = req.body;
  const existing = db.prepare("SELECT * FROM push_channels WHERE user_id = ? AND type = 'wecom'").get(req.user.id);
  if (existing) {
    db.prepare("UPDATE push_channels SET name = ?, webhook = ?, active = ? WHERE id = ?").run(
      name,
      webhook,
      active ? 1 : 0,
      existing.id
    );
  } else {
    db.prepare(
      "INSERT INTO push_channels (user_id, type, name, webhook, active) VALUES (?, 'wecom', ?, ?, ?)"
    ).run(req.user.id, name, webhook, active ? 1 : 0);
  }
  return res.json({ code: 200, msg: "success" });
});

router.post("/channels/wechat", requireAuth, (req, res) => {
  const { name, appId, appSecret, templateId, openids, templateJson, active = 1 } = req.body;
  const existing = db.prepare("SELECT * FROM push_channels WHERE user_id = ? AND type = 'wechat'").get(req.user.id);
  if (existing) {
    db.prepare(
      "UPDATE push_channels SET name = ?, app_id = ?, app_secret = ?, template_id = ?, openids = ?, template_json = ?, active = ? WHERE id = ?"
    ).run(name, appId, appSecret, templateId, openids, templateJson, active ? 1 : 0, existing.id);
  } else {
    db.prepare(
      "INSERT INTO push_channels (user_id, type, name, app_id, app_secret, template_id, openids, template_json, active) VALUES (?, 'wechat', ?, ?, ?, ?, ?, ?, ?)"
    ).run(req.user.id, name, appId, appSecret, templateId, openids, templateJson, active ? 1 : 0);
  }
  return res.json({ code: 200, msg: "success" });
});

router.post("/channels/feishu", requireAuth, (req, res) => {
  const { name, webhook, secret, active = 1 } = req.body;
  const existing = db.prepare("SELECT * FROM push_channels WHERE user_id = ? AND type = 'feishu'").get(req.user.id);
  if (existing) {
    db.prepare("UPDATE push_channels SET name = ?, webhook = ?, secret = ?, active = ? WHERE id = ?").run(
      name,
      webhook,
      secret,
      active ? 1 : 0,
      existing.id
    );
  } else {
    db.prepare(
      "INSERT INTO push_channels (user_id, type, name, webhook, secret, active) VALUES (?, 'feishu', ?, ?, ?, ?)"
    ).run(req.user.id, name, webhook, secret, active ? 1 : 0);
  }
  return res.json({ code: 200, msg: "success" });
});

router.post("/channels/:type/test", requireAuth, async (req, res) => {
  const { type } = req.params;
  const channel = db
    .prepare("SELECT * FROM push_channels WHERE user_id = ? AND type = ?")
    .get(req.user.id, type);
  if (!channel) {
    return res.status(404).json({ code: 404, msg: "通道不存在" });
  }
  let contentConfig = {};
  const schedule = db.prepare("SELECT * FROM push_schedule WHERE user_id = ?").get(req.user.id);
  if (schedule && schedule.content_json) {
    try {
      contentConfig = JSON.parse(schedule.content_json);
    } catch (error) {
      contentConfig = {};
    }
  }
  try {
    await fetchAiFeedsForUser(req.user.id);
    const result = await sendDigestByChannel(channel, contentConfig, { userId: req.user.id });
    return res.json({ code: 200, msg: "success", data: result });
  } catch (error) {
    return res.status(400).json({ code: 400, msg: error.message });
  }
});

module.exports = router;
