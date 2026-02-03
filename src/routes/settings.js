const express = require("express");
const db = require("../db");
const { requireAuth } = require("../utils/auth");
const { sendDigestByChannel } = require("../services/push");

const router = express.Router();

function getUserChannels(userId) {
  return db.prepare("SELECT * FROM push_channels WHERE user_id = ? ORDER BY id DESC").all(userId);
}

router.get("/settings", requireAuth, (req, res) => {
  let schedule = db.prepare("SELECT * FROM push_schedule WHERE user_id = ?").get(req.user.id);
  if (!schedule) {
    db.prepare("INSERT INTO push_schedule (user_id) VALUES (?)").run(req.user.id);
    schedule = db.prepare("SELECT * FROM push_schedule WHERE user_id = ?").get(req.user.id);
  }
  const channels = getUserChannels(req.user.id);
  return res.json({ code: 200, msg: "success", data: { schedule, channels } });
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
    const result = await sendDigestByChannel(channel, contentConfig);
    return res.json({ code: 200, msg: "success", data: result });
  } catch (error) {
    return res.status(400).json({ code: 400, msg: error.message });
  }
});

module.exports = router;
