const Parser = require("rss-parser");
const db = require("../db");

const parser = new Parser({
  timeout: 20000,
  headers: {
    "User-Agent": "AI-Radar/1.0 (+https://localhost)",
    Accept: "application/rss+xml,application/xml;q=0.9,*/*;q=0.8",
  },
});

const defaultFeeds = [
  { name: "OpenAI Blog", url: "https://openai.com/blog/rss" },
  { name: "Hugging Face", url: "https://huggingface.co/blog/feed.xml" },
  { name: "arXiv CS.AI", url: "http://export.arxiv.org/rss/cs.AI" },
  { name: "Anthropic News", url: "https://www.anthropic.com/news/rss.xml" },
];

function normalizeFeed(feed) {
  if (!feed || !feed.url) return null;
  const name = (feed.name || "").trim();
  const url = feed.url.trim();
  return { name: name || url, url };
}

function dedupeFeeds(feeds) {
  const map = new Map();
  feeds.forEach((feed) => {
    const normalized = normalizeFeed(feed);
    if (!normalized) return;
    if (!map.has(normalized.url)) {
      map.set(normalized.url, normalized);
    }
  });
  return Array.from(map.values());
}

function getDefaultSourceUrls() {
  return defaultFeeds.map((item) => item.url);
}

function getActiveUserSources(userId) {
  if (!userId) return [];
  return db
    .prepare("SELECT * FROM ai_sources WHERE user_id = ? AND active = 1 AND type = 'rss' ORDER BY id DESC")
    .all(userId);
}

function getUserSourceUrls(userId) {
  const sources = getActiveUserSources(userId);
  if (!sources.length) return getDefaultSourceUrls();
  return sources.map((item) => item.url);
}

async function fetchAiFeeds(feeds = defaultFeeds) {
  const items = [];
  const normalizedFeeds = dedupeFeeds(feeds);
  for (const feed of normalizedFeeds) {
    try {
      const feedData = await parser.parseURL(feed.url);
      feedData.items.slice(0, 10).forEach((item) => {
        items.push({
          source: feed.name,
          source_url: feed.url,
          title: item.title || "",
          url: item.link || item.guid || "",
          summary: item.contentSnippet || item.summary || "",
          published_at: item.isoDate || item.pubDate || "",
        });
      });
    } catch (error) {
      console.error(`AI feed 读取失败: ${feed.name}`, error.message);
    }
  }

  const insertStmt = db.prepare(`
    INSERT INTO ai_items (source, source_url, title, url, summary, published_at)
    VALUES (@source, @source_url, @title, @url, @summary, @published_at)
    ON CONFLICT(url) DO UPDATE SET
      source = excluded.source,
      source_url = excluded.source_url,
      summary = excluded.summary,
      published_at = excluded.published_at
  `);

  const insertMany = db.transaction((rows) => {
    rows.forEach((row) => {
      if (row.url) {
        insertStmt.run(row);
      }
    });
  });

  insertMany(items);
  return items;
}

async function fetchAiFeedsForUser(userId) {
  const sources = getActiveUserSources(userId);
  const feeds = sources.length
    ? sources.map((item) => ({ name: item.name || item.url, url: item.url }))
    : defaultFeeds;
  return fetchAiFeeds(feeds);
}

async function fetchAiFeedsForAllUsers() {
  const rows = db
    .prepare("SELECT DISTINCT name, url FROM ai_sources WHERE active = 1 AND type = 'rss'")
    .all();
  const feeds = dedupeFeeds([...defaultFeeds, ...rows]);
  return fetchAiFeeds(feeds);
}

function getLatestAi(limit = 20, sourceUrls = []) {
  const urls = (sourceUrls || []).filter(Boolean);
  if (!urls.length) {
    return db
      .prepare("SELECT * FROM ai_items ORDER BY datetime(published_at) DESC, id DESC LIMIT ?")
      .all(limit);
  }
  const placeholders = urls.map(() => "?").join(", ");
  return db
    .prepare(
      `SELECT * FROM ai_items WHERE source_url IN (${placeholders}) ORDER BY datetime(published_at) DESC, id DESC LIMIT ?`
    )
    .all(...urls, limit);
}

function classifyAiItem(item) {
  const source = (item.source || "").toLowerCase();
  if (source.includes("arxiv") || source.includes("paper") || source.includes("research")) {
    return "research";
  }
  if (source.includes("hugging") || source.includes("open source") || source.includes("github")) {
    return "opensource";
  }
  if (source.includes("openai") || source.includes("anthropic") || source.includes("product")) {
    return "product";
  }
  return "ai";
}

module.exports = {
  fetchAiFeeds,
  fetchAiFeedsForUser,
  fetchAiFeedsForAllUsers,
  getLatestAi,
  getDefaultSourceUrls,
  getUserSourceUrls,
  defaultFeeds,
  classifyAiItem,
};
