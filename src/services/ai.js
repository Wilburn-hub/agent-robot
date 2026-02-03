const Parser = require("rss-parser");
const db = require("../db");

const parser = new Parser();

const defaultFeeds = [
  { name: "OpenAI Blog", url: "https://openai.com/blog/rss" },
  { name: "Hugging Face", url: "https://huggingface.co/blog/feed.xml" },
  { name: "arXiv CS.AI", url: "http://export.arxiv.org/rss/cs.AI" },
  { name: "Anthropic News", url: "https://www.anthropic.com/news/rss.xml" },
];

async function fetchAiFeeds() {
  const items = [];

  for (const feed of defaultFeeds) {
    try {
      const feedData = await parser.parseURL(feed.url);
      feedData.items.slice(0, 10).forEach((item) => {
        items.push({
          source: feed.name,
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
    INSERT OR IGNORE INTO ai_items (source, title, url, summary, published_at)
    VALUES (@source, @title, @url, @summary, @published_at)
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

function getLatestAi(limit = 20) {
  return db
    .prepare("SELECT * FROM ai_items ORDER BY datetime(published_at) DESC, id DESC LIMIT ?")
    .all(limit);
}

module.exports = {
  fetchAiFeeds,
  getLatestAi,
  defaultFeeds,
};
