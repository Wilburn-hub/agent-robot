const { getLatestTrending } = require("./github");
const { getLatestAi, classifyAiItem } = require("./ai");

function normalizeKeywords(keywordText) {
  if (!keywordText) return [];
  return keywordText
    .split(/[,，\\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function containsKeywords(text, keywords) {
  if (!keywords.length) return true;
  const lower = (text || "").toLowerCase();
  return keywords.some((keyword) => lower.includes(keyword.toLowerCase()));
}

function filterTrending(items, keywords) {
  if (!keywords.length) return items;
  return items.filter((item) =>
    containsKeywords(`${item.owner} ${item.name} ${item.description || ""}`, keywords)
  );
}

function filterAi(items, keywords) {
  if (!keywords.length) return items;
  return items.filter((item) =>
    containsKeywords(`${item.title} ${item.summary || ""} ${item.source || ""}`, keywords)
  );
}

function buildDigestText(options = {}) {
  const { topics = ["weekly", "ai"], keywords = "" } = options;
  const keywordList = normalizeKeywords(keywords);
  const includeTrending = topics.includes("weekly") || topics.includes("trending");
  const includeAi = topics.includes("ai") || topics.includes("papers");
  const includePapers = topics.includes("papers");

  const lines = [];
  lines.push("【AI 机器人周报】今日简报");
  lines.push("");

  if (includeTrending) {
    const trending = filterTrending(getLatestTrending(), keywordList).slice(0, 5);
    lines.push("一、GitHub 周度热度");
    if (!trending.length) {
      lines.push("暂无匹配热度项目");
    } else {
      trending.forEach((item, index) => {
        lines.push(
          `${index + 1}. ${item.owner}/${item.name} (+${item.stars_delta}) ${item.language || ""}`.trim()
        );
      });
    }
    lines.push("");
  }

  if (includeAi) {
    const aiItems = filterAi(getLatestAi(10), keywordList);
    lines.push("二、AI 资讯信号");
    const mainAi = aiItems.slice(0, 5);
    if (!mainAi.length) {
      lines.push("暂无匹配 AI 资讯");
    } else {
      mainAi.forEach((item, index) => {
        lines.push(`${index + 1}. ${item.title} (${item.source})`);
      });
    }
    lines.push("");

    if (includePapers) {
      const papers = aiItems.filter((item) => classifyAiItem(item) === "research").slice(0, 3);
      lines.push("三、研究论文精选");
      if (!papers.length) {
        lines.push("暂无匹配论文条目");
      } else {
        papers.forEach((item, index) => {
          lines.push(`${index + 1}. ${item.title} (${item.source})`);
        });
      }
      lines.push("");
    }
  }

  lines.push("来源：GitHub Trending + AI RSS 聚合");
  return lines.join("\n");
}

function buildDigestSummary(options = {}) {
  const { topics = ["weekly", "ai"], keywords = "" } = options;
  const keywordList = normalizeKeywords(keywords);
  const includeTrending = topics.includes("weekly") || topics.includes("trending");
  const includeAi = topics.includes("ai") || topics.includes("papers");
  const includePapers = topics.includes("papers");

  const trending = includeTrending
    ? filterTrending(getLatestTrending(), keywordList).slice(0, 3)
    : [];
  const aiItems = includeAi ? filterAi(getLatestAi(8), keywordList).slice(0, 3) : [];
  const papers = includePapers
    ? filterAi(getLatestAi(20), keywordList).filter((item) => classifyAiItem(item) === "research").slice(0, 3)
    : [];

  return {
    trending,
    aiItems,
    papers,
  };
}

module.exports = {
  buildDigestText,
  buildDigestSummary,
};
