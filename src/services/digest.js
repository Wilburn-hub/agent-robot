const { getLatestTrending } = require("./github");
const { getLatestAi, classifyAiItem } = require("./ai");
const { translateToZh } = require("./translate");

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

function formatCompactNumber(value) {
  const num = Number(value || 0);
  if (num >= 100000000) return `${(num / 100000000).toFixed(1)}亿`;
  if (num >= 10000) return `${(num / 10000).toFixed(1)}万`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}千`;
  return String(num);
}

function truncateText(text, max = 60) {
  const clean = (text || "").replace(/\s+/g, " ").trim();
  if (!clean) return "";
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max)}...`;
}

async function mapWithConcurrency(list, limit, mapper) {
  const results = new Array(list.length);
  let index = 0;
  async function worker() {
    while (index < list.length) {
      const current = index++;
      results[current] = await mapper(list[current], current);
    }
  }
  const workers = Array.from({ length: Math.min(limit, list.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

function hasChinese(text) {
  return /[\u4e00-\u9fa5]/.test(text || "");
}

function formatDateTime() {
  const now = new Date();
  const date = now.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const time = now.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${date} ${time}`;
}

function mapAiCategory(item) {
  const tag = classifyAiItem(item);
  if (tag === "research") return "研究";
  if (tag === "product") return "产品";
  if (tag === "opensource") return "开源";
  return "AI";
}

async function buildDigestText(options = {}) {
  const { topics = ["weekly", "ai"], keywords = "" } = options;
  const keywordList = normalizeKeywords(keywords);
  const includeTrending = topics.includes("weekly") || topics.includes("trending");
  const includeAi = topics.includes("ai") || topics.includes("papers");
  const includePapers = topics.includes("papers");

  const lines = [];
  lines.push("### AI 机器人周报 · 今日简报");
  lines.push(`> 时间：${formatDateTime()}`);
  if (keywordList.length) {
    lines.push(`> 关键词：${keywordList.join(" / ")}`);
  }
  lines.push("");

  if (includeTrending) {
    const trending = filterTrending(getLatestTrending(), keywordList).slice(0, 5);
    lines.push("**一、GitHub 周度热度**");
    if (!trending.length) {
      lines.push("- 暂无匹配热度项目");
    } else {
      const descList = await mapWithConcurrency(
        trending,
        3,
        async (item) => {
          const descRaw = truncateText(item.description || "", 200);
          return translateToZh(descRaw);
        }
      );
      for (let i = 0; i < trending.length; i += 1) {
        const item = trending[i];
        const descRaw = truncateText(item.description || "", 200);
        const descZh = descList[i];
        const desc = truncateText(descZh || descRaw, 90);
        const lang = item.language ? ` · 语言：${item.language}` : "";
        const title = item.url
          ? `[${item.owner}/${item.name}](${item.url})`
          : `${item.owner}/${item.name}`;
        lines.push(`- ${title}（新增星标：${formatCompactNumber(item.stars_delta)}${lang}）`);
        if (desc) {
          lines.push(`> 简介：${desc}${hasChinese(desc) ? "" : "（原文）"}`);
        }
      }
    }
    lines.push("");
  }

  if (includeAi) {
    const aiItems = filterAi(getLatestAi(10), keywordList);
    lines.push("**二、AI 资讯信号**");
    const mainAi = aiItems.slice(0, 5);
    if (!mainAi.length) {
      lines.push("- 暂无匹配 AI 资讯");
    } else {
      const titleList = await mapWithConcurrency(
        mainAi,
        3,
        async (item) => translateToZh(item.title || "")
      );
      const summaryList = await mapWithConcurrency(
        mainAi,
        3,
        async (item) => translateToZh(truncateText(item.summary || "", 240))
      );
      for (let i = 0; i < mainAi.length; i += 1) {
        const item = mainAi[i];
        const titleZh = titleList[i];
        const titleText = truncateText(titleZh || item.title, 90);
        const title = item.url ? `[${titleText}](${item.url})` : titleText;
        const source = item.source ? `来源：${item.source}` : "来源：未知";
        const category = `类型：${mapAiCategory(item)}`;
        const langHint = hasChinese(titleText) ? "" : " · 英文标题";
        lines.push(`- ${title}（${source} · ${category}${langHint}）`);
        if (item.summary) {
          const summaryZh = summaryList[i];
          const summary = truncateText(summaryZh || item.summary, 100);
          lines.push(`> 摘要：${summary}${hasChinese(summary) ? "" : "（原文）"}`);
        }
      }
    }
    lines.push("");

    if (includePapers) {
      const papers = aiItems.filter((item) => classifyAiItem(item) === "research").slice(0, 3);
      lines.push("**三、研究论文精选**");
      if (!papers.length) {
        lines.push("- 暂无匹配论文条目");
      } else {
        const paperTitleList = await mapWithConcurrency(
          papers,
          2,
          async (item) => translateToZh(item.title || "")
        );
        const paperSummaryList = await mapWithConcurrency(
          papers,
          2,
          async (item) => translateToZh(truncateText(item.summary || "", 240))
        );
        for (let i = 0; i < papers.length; i += 1) {
          const item = papers[i];
          const titleZh = paperTitleList[i];
          const titleText = truncateText(titleZh || item.title, 90);
          const title = item.url ? `[${titleText}](${item.url})` : titleText;
          const source = item.source ? `来源：${item.source}` : "来源：未知";
          const langHint = hasChinese(titleText) ? "" : " · 英文标题";
          lines.push(`- ${title}（${source}${langHint}）`);
          if (item.summary) {
            const summaryZh = paperSummaryList[i];
            const summary = truncateText(summaryZh || item.summary, 100);
            lines.push(`> 摘要：${summary}${hasChinese(summary) ? "" : "（原文）"}`);
          }
        }
      }
      lines.push("");
    }
  }

  lines.push("> 来源：GitHub Trending + AI RSS 聚合");
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
