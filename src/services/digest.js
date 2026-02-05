const { getLatestTrending } = require("./github");
const { getLatestAi, classifyAiItem, getUserSourceUrls, getDefaultSourceUrls } = require("./ai");
const { getLatestSkills, normalizeSkillsType } = require("./skills");
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

function filterSkills(items, keywords) {
  if (!keywords.length) return items;
  return items.filter((item) =>
    containsKeywords(`${item.name || ""} ${item.skill_id || ""} ${item.source || ""}`, keywords)
  );
}

function formatCompactNumber(value) {
  const num = Number(value || 0);
  if (num >= 100000000) return `${(num / 100000000).toFixed(1)}亿`;
  if (num >= 10000) return `${(num / 10000).toFixed(1)}万`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}千`;
  return String(num);
}

function formatChange(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "--";
  const num = Number(value);
  const sign = num >= 0 ? "+" : "-";
  return `${sign}${formatCompactNumber(Math.abs(num))}`;
}

function truncateText(text, max = 60) {
  const clean = (text || "").replace(/\s+/g, " ").trim();
  if (!clean) return "";
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max)}...`;
}

function normalizeSummary(text) {
  const clean = (text || "").replace(/\s+/g, " ").trim();
  if (!clean) return "";
  return clean
    .replace(/^arXiv:\S+\s+Announce Type:\s*\w+\s*Abstract:\s*/i, "")
    .replace(/^arXiv:\S+\s+Abstract:\s*/i, "")
    .replace(/^Abstract:\s*/i, "");
}

function pickTranslated(original, translated) {
  if (!original) return "";
  const originalClean = (original || "").trim();
  const translatedClean = (translated || "").trim();
  if (!translatedClean) return originalClean;
  if (translatedClean === originalClean) {
    return originalClean;
  }
  return translatedClean;
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

function normalizeLimit(value, fallback, min = 1, max = 100) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  const safe = Math.max(min, Math.min(max, Math.floor(num)));
  return safe;
}

function resolveSourceUrls(options = {}) {
  if (Array.isArray(options.sourceUrls) && options.sourceUrls.length) {
    return options.sourceUrls;
  }
  if (options.userId) {
    return getUserSourceUrls(options.userId);
  }
  return getDefaultSourceUrls();
}

function mapAiCategory(item) {
  const tag = classifyAiItem(item);
  if (tag === "research") return "研究";
  if (tag === "product") return "产品";
  if (tag === "opensource") return "开源";
  return "AI";
}

function buildSkillPath(item) {
  const source = (item?.source || "").trim();
  const skillId = (item?.skill_id || "").trim();
  if (source && skillId) return `${source}/${skillId}`;
  return source || skillId || "";
}

function buildSkillUrl(item) {
  const source = (item?.source || "").trim();
  const skillId = (item?.skill_id || "").trim();
  if (source && skillId) return `https://skills.sh/${source}/${skillId}`;
  return "";
}

function formatSkillsLabel(type) {
  if (type === "hot") return "热度变化";
  if (type === "all_time") return "历史累计";
  return "24H 热门";
}

async function buildDigestText(options = {}) {
  const { topics = ["weekly", "ai"], keywords = "" } = options;
  const keywordList = normalizeKeywords(keywords);
  const includeTrending = topics.includes("weekly") || topics.includes("trending");
  const includeAi = topics.includes("ai") || topics.includes("papers");
  const includePapers = topics.includes("papers");
  const includeSkills = topics.includes("skills");
  const trendingLimit = normalizeLimit(options.trendingLimit, 5, 1, 50);
  const aiLimit = normalizeLimit(options.aiLimit, 20, 5, 100);
  const papersLimit = normalizeLimit(options.papersLimit, 5, 1, 50);
  const skillsLimit = normalizeLimit(options.skillsLimit, 8, 1, 30);
  const skillsType = normalizeSkillsType(options.skillsType);
  const sourceUrls = resolveSourceUrls(options);

  const lines = [];
  lines.push("### AI 机器人周报 · 今日简报");
  lines.push(`> 时间：${formatDateTime()}`);
  if (keywordList.length) {
    lines.push(`> 关键词：${keywordList.join(" / ")}`);
  }
  lines.push("");

  const indexLabels = ["一", "二", "三", "四", "五", "六", "七", "八"];
  let sectionIndex = 0;
  const pushSectionTitle = (title) => {
    const label = indexLabels[sectionIndex] || `${sectionIndex + 1}`;
    sectionIndex += 1;
    lines.push(`**${label}、${title}**`);
  };

  if (includeTrending) {
    pushSectionTitle("GitHub 周度热度");
    const trending = filterTrending(getLatestTrending(), keywordList).slice(0, trendingLimit);
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
        const desc = truncateText(pickTranslated(descRaw, descZh), 90);
        const lang = item.language ? ` · 语言：${item.language}` : "";
        const title = item.url
          ? `[${item.owner}/${item.name}](${item.url})`
          : `${item.owner}/${item.name}`;
        lines.push(`- ${title}（新增星标：${formatCompactNumber(item.stars_delta)}${lang}）`);
        if (desc) {
          lines.push(`> 简介：${desc}`);
        }
      }
    }
    lines.push("");
  }

  if (includeAi) {
    pushSectionTitle("AI 资讯信号");
    const fetchLimit = Math.max(aiLimit, papersLimit * 3, 30);
    const aiItems = filterAi(getLatestAi(fetchLimit, sourceUrls), keywordList);
    const mainAi = aiItems.slice(0, aiLimit);
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
        async (item) => translateToZh(truncateText(normalizeSummary(item.summary || ""), 240))
      );
      for (let i = 0; i < mainAi.length; i += 1) {
        const item = mainAi[i];
        const titleZh = titleList[i];
        const titleText = truncateText(pickTranslated(item.title, titleZh), 90);
        const title = item.url ? `[${titleText}](${item.url})` : titleText;
        const source = item.source ? `来源：${item.source}` : "来源：未知";
        const category = `类型：${mapAiCategory(item)}`;
        lines.push(`- ${title}（${source} · ${category}）`);
        if (item.summary) {
          const summaryZh = summaryList[i];
          const summary = truncateText(pickTranslated(normalizeSummary(item.summary || ""), summaryZh), 100);
          lines.push(`> 摘要：${summary}`);
        }
      }
    }
    lines.push("");

    if (includePapers) {
      pushSectionTitle("研究论文精选");
      const papers = aiItems.filter((item) => classifyAiItem(item) === "research").slice(0, papersLimit);
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
          async (item) => translateToZh(truncateText(normalizeSummary(item.summary || ""), 240))
        );
        for (let i = 0; i < papers.length; i += 1) {
          const item = papers[i];
          const titleZh = paperTitleList[i];
          const titleText = truncateText(pickTranslated(item.title, titleZh), 90);
          const title = item.url ? `[${titleText}](${item.url})` : titleText;
          const source = item.source ? `来源：${item.source}` : "来源：未知";
          lines.push(`- ${title}（${source}）`);
          if (item.summary) {
            const summaryZh = paperSummaryList[i];
            const summary = truncateText(pickTranslated(normalizeSummary(item.summary || ""), summaryZh), 100);
            lines.push(`> 摘要：${summary}`);
          }
        }
      }
      lines.push("");
    }
  }

  if (includeSkills) {
    pushSectionTitle(`Skills 热度榜（${formatSkillsLabel(skillsType)}）`);
    const fetchLimit = Math.max(skillsLimit * 3, 30);
    const skillsResult = getLatestSkills(skillsType, fetchLimit);
    const skills = filterSkills(skillsResult.list, keywordList).slice(0, skillsLimit);
    if (!skills.length) {
      lines.push("- 暂无 Skills 榜单");
    } else {
      for (const item of skills) {
        const titleText = item.name || item.skill_id || "未命名 Skill";
        const skillUrl = buildSkillUrl(item);
        const title = skillUrl ? `[${titleText}](${skillUrl})` : titleText;
        const changeText = formatChange(item.change);
        const path = buildSkillPath(item);
        const metaParts = [
          `安装量：${formatCompactNumber(item.installs)}`,
          `变化：${changeText}`,
          path ? `标识：${path}` : null,
        ].filter(Boolean);
        lines.push(`- ${title}（${metaParts.join(" · ")}）`);
      }
    }
    lines.push("");
  }

  const sources = ["GitHub Trending", "AI RSS 聚合"];
  if (includeSkills) {
    sources.push("skills.sh");
  }
  lines.push(`> 来源：${sources.join(" + ")}`);
  return lines.join("\n");
}

function buildDigestSummary(options = {}) {
  const { topics = ["weekly", "ai"], keywords = "" } = options;
  const keywordList = normalizeKeywords(keywords);
  const includeTrending = topics.includes("weekly") || topics.includes("trending");
  const includeAi = topics.includes("ai") || topics.includes("papers");
  const includePapers = topics.includes("papers");
  const includeSkills = topics.includes("skills");
  const sourceUrls = resolveSourceUrls(options);
  const trendingLimit = normalizeLimit(options.trendingLimit, 3, 1, 5);
  const aiLimit = normalizeLimit(options.aiLimit, 6, 3, 8);
  const papersLimit = normalizeLimit(options.papersLimit, 3, 1, 5);
  const skillsLimit = normalizeLimit(options.skillsLimit, 5, 1, 8);
  const skillsType = normalizeSkillsType(options.skillsType);

  const trending = includeTrending
    ? filterTrending(getLatestTrending(), keywordList).slice(0, trendingLimit)
    : [];
  const aiItems = includeAi
    ? filterAi(getLatestAi(Math.max(aiLimit, 12), sourceUrls), keywordList).slice(0, aiLimit)
    : [];
  const papers = includePapers
    ? filterAi(getLatestAi(Math.max(aiLimit * 2, 20), sourceUrls), keywordList)
        .filter((item) => classifyAiItem(item) === "research")
        .slice(0, papersLimit)
    : [];
  const skillsItems = includeSkills
    ? filterSkills(getLatestSkills(skillsType, Math.max(skillsLimit * 3, 20)).list, keywordList).slice(0, skillsLimit)
    : [];

  return {
    trending,
    aiItems,
    papers,
    skillsItems,
    skillsType,
  };
}

module.exports = {
  buildDigestText,
  buildDigestSummary,
};
