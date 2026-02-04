const express = require("express");
const axios = require("axios");
const { randomUUID } = require("crypto");
const db = require("../db");
const { hashPassword, verifyPassword, signToken, requireAuth, syncAdminRoleByEmail } = require("../utils/auth");

const router = express.Router();

function buildUserResponse(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    githubId: user.github_id,
  };
}

router.post("/register", (req, res) => {
  const { name, email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ code: 400, msg: "邮箱与密码必填" });
  }
  const existing = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  if (existing) {
    return res.status(400).json({ code: 400, msg: "邮箱已存在" });
  }
  const passwordHash = hashPassword(password);
  const stmt = db.prepare("INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)");
  const info = stmt.run(email, passwordHash, name || "");
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(info.lastInsertRowid);

  db.prepare("INSERT OR IGNORE INTO push_schedule (user_id) VALUES (?)").run(user.id);
  syncAdminRoleByEmail(user.email);

  const token = signToken({ id: user.id, email: user.email, name: user.name });
  return res.json({ code: 200, msg: "success", data: { token, user: buildUserResponse(user) } });
});

router.post("/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ code: 400, msg: "邮箱与密码必填" });
  }
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  if (!user || !user.password_hash) {
    return res.status(400).json({ code: 400, msg: "账号或密码错误" });
  }
  if (!verifyPassword(password, user.password_hash)) {
    return res.status(400).json({ code: 400, msg: "账号或密码错误" });
  }
  syncAdminRoleByEmail(user.email);
  const token = signToken({ id: user.id, email: user.email, name: user.name });
  return res.json({ code: 200, msg: "success", data: { token, user: buildUserResponse(user) } });
});

router.get("/me", requireAuth, (req, res) => {
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);
  if (!user) {
    return res.status(404).json({ code: 404, msg: "用户不存在" });
  }
  return res.json({ code: 200, msg: "success", data: buildUserResponse(user) });
});

router.put("/me", requireAuth, (req, res) => {
  const { name, email } = req.body;
  if (!email) {
    return res.status(400).json({ code: 400, msg: "邮箱不能为空" });
  }
  const existing = db.prepare("SELECT * FROM users WHERE email = ? AND id <> ?").get(email, req.user.id);
  if (existing) {
    return res.status(400).json({ code: 400, msg: "邮箱已被占用" });
  }
  db.prepare("UPDATE users SET name = ?, email = ? WHERE id = ?").run(name || "", email, req.user.id);
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);
  return res.json({ code: 200, msg: "success", data: buildUserResponse(user) });
});

router.get("/providers", (req, res) => {
  const githubEnabled = Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET);
  return res.json({ code: 200, msg: "success", data: { githubEnabled } });
});

router.get("/github", (req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return res.status(500).send("GitHub OAuth 未配置");
  }
  const state = randomUUID();
  req.session.githubState = state;
  const redirectUri =
    process.env.GITHUB_REDIRECT_URI || `${req.protocol}://${req.get("host")}/api/auth/github/callback`;
  const url = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&state=${state}&scope=read:user user:email`;
  return res.redirect(url);
});

router.get("/github/callback", async (req, res) => {
  const { code, state } = req.query;
  if (!code || !state || state !== req.session.githubState) {
    return res.status(400).send("GitHub OAuth 校验失败");
  }

  try {
    const tokenRes = await axios.post(
      "https://github.com/login/oauth/access_token",
      {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      },
      { headers: { Accept: "application/json" } }
    );

    const accessToken = tokenRes.data.access_token;
    if (!accessToken) {
      throw new Error("未获取到 GitHub token");
    }

    const userRes = await axios.get("https://api.github.com/user", {
      headers: { Authorization: `token ${accessToken}` },
    });
    const githubUser = userRes.data;

    let email = githubUser.email;
    if (!email) {
      const emailsRes = await axios.get("https://api.github.com/user/emails", {
        headers: { Authorization: `token ${accessToken}` },
      });
      const primary = emailsRes.data.find((item) => item.primary) || emailsRes.data[0];
      email = primary ? primary.email : null;
    }

    if (!user) {
      const info = db
        .prepare("INSERT INTO users (email, name, github_id) VALUES (?, ?, ?)")
        .run(email, githubUser.name || githubUser.login, String(githubUser.id));
      user = db.prepare("SELECT * FROM users WHERE id = ?").get(info.lastInsertRowid);
      db.prepare("INSERT OR IGNORE INTO push_schedule (user_id) VALUES (?)").run(user.id);
    }

    syncAdminRoleByEmail(user.email);
    const token = signToken({ id: user.id, email: user.email, name: user.name });
    console.log(`[OAuth Debug] User: ${user.email}, Token: ${token.slice(0, 10)}...`);
    const redirectTarget = `/auth?token=${token}`;
    console.log(`[OAuth Debug] Redirecting to: ${redirectTarget}`);
    return res.redirect(redirectTarget);
  } catch (error) {
    console.error("GitHub OAuth 失败:", error.message);
    return res.status(500).send("GitHub 登录失败");
  }
});

module.exports = router;
