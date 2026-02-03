const { getLatestTrending } = require("./github");
const { getLatestAi } = require("./ai");

function buildDigestText() {
  const trending = getLatestTrending().slice(0, 5);
  const aiItems = getLatestAi(5);

  const lines = [];
  lines.push("【AI 机器人周报】今日简报");
  lines.push("");
  lines.push("一、GitHub 周度热度");
  trending.forEach((item, index) => {
    lines.push(
      `${index + 1}. ${item.owner}/${item.name} (+${item.stars_delta}) ${item.language || ""}`.trim()
    );
  });
  lines.push("");
  lines.push("二、AI 资讯信号");
  aiItems.forEach((item, index) => {
    lines.push(`${index + 1}. ${item.title} (${item.source})`);
  });
  lines.push("");
  lines.push("来源：GitHub Trending + AI RSS 聚合");

  return lines.join("\n");
}

function buildDigestSummary() {
  const trending = getLatestTrending().slice(0, 3);
  const aiItems = getLatestAi(3);
  return {
    trending,
    aiItems,
  };
}

module.exports = {
  buildDigestText,
  buildDigestSummary,
};
