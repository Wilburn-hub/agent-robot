const express = require("express");
const db = require("../db");
const { requireAuth, requireAdmin } = require("../utils/auth");

const router = express.Router();

// 所有后台接口都需要登录 + 管理员权限
router.use(requireAuth, requireAdmin);

// 系统统计数据
router.get("/stats", (req, res) => {
  const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get().count;
  const channelCount = db.prepare("SELECT COUNT(*) as count FROM push_channels WHERE active = 1").get().count;
  const logCount = db.prepare("SELECT COUNT(*) as count FROM push_logs").get().count;
  const successCount = db.prepare("SELECT COUNT(*) as count FROM push_logs WHERE status = 'success'").get().count;
  const dataJobs = db
    .prepare("SELECT name, last_run_at, last_status, last_message, last_count FROM data_jobs ORDER BY name ASC")
    .all();

  return res.json({
    code: 200,
    msg: "success",
    data: {
      userCount,
      channelCount,
      logCount,
      successRate: logCount > 0 ? Math.round((successCount / logCount) * 100) : 0,
      dataJobs,
    },
  });
});

// 用户列表
router.get("/users", (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const offset = (page - 1) * limit;

  const total = db.prepare("SELECT COUNT(*) as count FROM users").get().count;
  const users = db.prepare(`
    SELECT id, email, name, github_id, role, created_at
    FROM users
    ORDER BY id DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset);

  return res.json({
    code: 200,
    msg: "success",
    data: { users, total, page, limit },
  });
});

// 编辑用户
router.put("/users/:id", (req, res) => {
  const { id } = req.params;
  const { name, email, role } = req.body;

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
  if (!user) {
    return res.status(404).json({ code: 404, msg: "用户不存在" });
  }

  // 不能修改自己的角色（防止误操作）
  if (parseInt(id, 10) === req.user.id && role && role !== user.role) {
    return res.status(400).json({ code: 400, msg: "不能修改自己的角色" });
  }

  db.prepare("UPDATE users SET name = ?, email = ?, role = ? WHERE id = ?")
    .run(name || user.name, email || user.email, role || user.role, id);

  const updated = db.prepare("SELECT id, email, name, github_id, role, created_at FROM users WHERE id = ?").get(id);
  return res.json({ code: 200, msg: "success", data: updated });
});

// 删除用户
router.delete("/users/:id", (req, res) => {
  const { id } = req.params;

  if (parseInt(id, 10) === req.user.id) {
    return res.status(400).json({ code: 400, msg: "不能删除自己" });
  }

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
  if (!user) {
    return res.status(404).json({ code: 404, msg: "用户不存在" });
  }

  // 删除用户相关数据
  db.prepare("DELETE FROM push_channels WHERE user_id = ?").run(id);
  db.prepare("DELETE FROM push_schedule WHERE user_id = ?").run(id);
  db.prepare("DELETE FROM ai_sources WHERE user_id = ?").run(id);
  db.prepare("DELETE FROM push_logs WHERE user_id = ?").run(id);
  db.prepare("DELETE FROM users WHERE id = ?").run(id);

  return res.json({ code: 200, msg: "success" });
});

// 推送日志列表
router.get("/logs", (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const offset = (page - 1) * limit;
  const status = req.query.status || "";

  let where = "";
  const params = [];
  if (status) {
    where = "WHERE l.status = ?";
    params.push(status);
  }

  const totalQuery = `SELECT COUNT(*) as count FROM push_logs l ${where}`;
  const total = db.prepare(totalQuery).get(...params).count;

  const logsQuery = `
    SELECT l.id, l.user_id, l.channel_id, l.status, l.detail, l.sent_at,
           u.email as user_email, u.name as user_name,
           c.type as channel_type, c.name as channel_name
    FROM push_logs l
    LEFT JOIN users u ON l.user_id = u.id
    LEFT JOIN push_channels c ON l.channel_id = c.id
    ${where}
    ORDER BY l.id DESC
    LIMIT ? OFFSET ?
  `;
  const logs = db.prepare(logsQuery).all(...params, limit, offset);

  return res.json({
    code: 200,
    msg: "success",
    data: { logs, total, page, limit },
  });
});

module.exports = router;
