const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const DEFAULT_ADMIN_EMAILS = ["liuweijia.vip@gmail.com"];

function normalizeEmail(email) {
  return (email || "").trim().toLowerCase();
}

function parseAdminEmails() {
  const sources = [process.env.ADMIN_EMAIL, process.env.ADMIN_EMAILS, ...DEFAULT_ADMIN_EMAILS];
  const emails = new Set();
  sources.forEach((value) => {
    if (!value) return;
    value
      .split(/[,;\\s]+/)
      .map((item) => normalizeEmail(item))
      .filter(Boolean)
      .forEach((item) => emails.add(item));
  });
  return emails;
}

function syncAdminRoleByEmail(email) {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;
  const adminEmails = parseAdminEmails();
  if (!adminEmails.size || !adminEmails.has(normalized)) return false;
  const db = require("../db");
  db.prepare("UPDATE users SET role = 'admin' WHERE lower(email) = ?").run(normalized);
  return true;
}

function hashPassword(password) {
  return bcrypt.hashSync(password, 10);
}

function verifyPassword(password, hash) {
  return bcrypt.compareSync(password, hash);
}

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) {
    return res.status(401).json({ code: 401, msg: "未登录" });
  }
  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    return next();
  } catch (error) {
    return res.status(401).json({ code: 401, msg: "登录已失效" });
  }
}

function requireAdmin(req, res, next) {
  // 需要先调用 requireAuth
  if (!req.user) {
    return res.status(401).json({ code: 401, msg: "未登录" });
  }
  syncAdminRoleByEmail(req.user.email);
  // 从数据库获取最新的角色信息
  const db = require("../db");
  const user = db.prepare("SELECT email, role FROM users WHERE id = ?").get(req.user.id);
  if (!user || user.role !== "admin") {
    return res.status(403).json({
      code: 403,
      msg: "无权限访问",
      debug: {
        id: req.user.id,
        email: user ? user.email.replace(/(.{2}).+(@.+)/, "$1***$2") : "unknown",
        role: user ? user.role : "none",
      },
    });
  }
  return next();
}

module.exports = {
  hashPassword,
  verifyPassword,
  signToken,
  verifyToken,
  requireAuth,
  requireAdmin,
  syncAdminRoleByEmail,
};
