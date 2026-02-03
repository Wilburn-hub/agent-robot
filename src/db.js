const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const dbPath = path.join(__dirname, "..", "data", "app.db");
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    password_hash TEXT,
    name TEXT,
    github_id TEXT UNIQUE,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS push_channels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    name TEXT,
    webhook TEXT,
    app_id TEXT,
    app_secret TEXT,
    template_id TEXT,
    openids TEXT,
    template_json TEXT,
    active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS push_schedule (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE NOT NULL,
    time TEXT DEFAULT '08:30',
    timezone TEXT DEFAULT 'Asia/Shanghai',
    frequency TEXT DEFAULT 'daily',
    content_json TEXT,
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS trending_repos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner TEXT,
    name TEXT,
    url TEXT,
    description TEXT,
    language TEXT,
    stars INTEGER,
    forks INTEGER,
    stars_delta INTEGER,
    snapshot_date TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS ai_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source TEXT,
    title TEXT,
    url TEXT UNIQUE,
    summary TEXT,
    published_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS push_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    channel_id INTEGER,
    status TEXT,
    detail TEXT,
    sent_at TEXT DEFAULT (datetime('now'))
  );
`);

module.exports = db;
