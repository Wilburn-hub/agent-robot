const axios = require("axios");
const cheerio = require("cheerio");
const db = require("../db");

function parseNumber(text) {
  if (!text) return 0;
  const normalized = text.replace(/,/g, "").trim().toLowerCase();
  if (normalized.endsWith("k")) {
    return Math.round(parseFloat(normalized.replace("k", "")) * 1000);
  }
  if (normalized.endsWith("m")) {
    return Math.round(parseFloat(normalized.replace("m", "")) * 1000000);
  }
  const value = parseInt(normalized, 10);
  return Number.isNaN(value) ? 0 : value;
}

function getTodayDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function fetchGitHubTrending() {
  const url = "https://github.com/trending?since=weekly";
  const response = await axios.get(url, {
    headers: {
      "User-Agent": "AgentRadar/1.0",
      "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    },
  });

  const $ = cheerio.load(response.data);
  const items = [];

  $("article.Box-row").each((_, element) => {
    const repoPath = $(element).find("h2 a").attr("href");
    if (!repoPath) return;
    const [owner, name] = repoPath.replace("/", "").split("/");
    const description = $(element).find("p").first().text().trim();
    const language = $(element).find("span[itemprop='programmingLanguage']").text().trim();
    const starsText = $(element).find("a[href$='/stargazers']").first().text().trim();
    const forksText = $(element).find("a[href$='/forks']").first().text().trim();
    const starsDeltaText = $(element)
      .find("span.d-inline-block.float-sm-right")
      .text()
      .replace("stars this week", "")
      .trim();

    items.push({
      owner,
      name,
      url: `https://github.com${repoPath}`,
      description,
      language,
      stars: parseNumber(starsText),
      forks: parseNumber(forksText),
      stars_delta: parseNumber(starsDeltaText),
    });
  });

  const snapshotDate = getTodayDate();
  const deleteStmt = db.prepare("DELETE FROM trending_repos WHERE snapshot_date = ?");
  deleteStmt.run(snapshotDate);

  const insertStmt = db.prepare(`
    INSERT INTO trending_repos (owner, name, url, description, language, stars, forks, stars_delta, snapshot_date)
    VALUES (@owner, @name, @url, @description, @language, @stars, @forks, @stars_delta, @snapshot_date)
  `);

  const insertMany = db.transaction((rows) => {
    rows.forEach((row) => {
      insertStmt.run({ ...row, snapshot_date: snapshotDate });
    });
  });

  insertMany(items);
  return items;
}

function getLatestTrending() {
  const latestDate = db.prepare("SELECT MAX(snapshot_date) AS date FROM trending_repos").get();
  if (!latestDate || !latestDate.date) {
    return [];
  }
  return db
    .prepare("SELECT * FROM trending_repos WHERE snapshot_date = ? ORDER BY stars_delta DESC, stars DESC LIMIT 20")
    .all(latestDate.date);
}

module.exports = {
  fetchGitHubTrending,
  getLatestTrending,
};
