const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

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

module.exports = {
  hashPassword,
  verifyPassword,
  signToken,
  verifyToken,
  requireAuth,
};
