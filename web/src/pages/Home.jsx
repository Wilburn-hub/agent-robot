import { animated, useSpring, useTrail } from "@react-spring/web";
import { useEffect, useMemo, useRef, useState } from "react";
import Topbar from "../components/Topbar";
import { API } from "../lib/api";
import usePrefersReducedMotion from "../lib/usePrefersReducedMotion";


const languageFilters = ["全部", "TypeScript", "Python", "Rust"];
const periodFilters = [
  { key: "weekly", label: "本周" },
  { key: "lastweek", label: "上周" },
  { key: "monthly", label: "30 天" },
];
const aiFilters = [
  { key: "all", label: "全部" },
  { key: "research", label: "研究" },
  { key: "product", label: "产品" },
  { key: "opensource", label: "开源" },
];
const skillsFilters = [
  { key: "trending", label: "24H 热门" },
  { key: "hot", label: "热度变化" },
  { key: "all_time", label: "历史累计" },
];

function formatCompactNumber(value) {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}m`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return String(value || 0);
}

function formatTime(value) {
  if (!value) return "--:--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--:--";
  return date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function hashString(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function truncateText(value, maxLength) {
  if (!value) return "";
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(0, maxLength - 1))}…`;
}

function buildSkillPath(item) {
  const source = (item?.source || "").trim();
  const skillId = (item?.skill_id || "").trim();
  if (source && skillId) return `${source}/${skillId}`;
  return source || skillId || "未命名 Skill";
}

function classifyAiTag(item) {
  const source = (item.source || "").toLowerCase();
  if (source.includes("arxiv") || source.includes("paper") || source.includes("research")) {
    return "研究";
  }
  if (source.includes("hugging") || source.includes("open source") || source.includes("github")) {
    return "开源";
  }
  if (source.includes("openai") || source.includes("anthropic") || source.includes("product")) {
    return "产品";
  }
  return item.tag || "AI";
}

function buildQuery(params) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      searchParams.set(key, value);
    }
  });
  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

export default function Home() {
  const [trending, setTrending] = useState([]);
  const [weekly, setWeekly] = useState([]);
  const [aiItems, setAiItems] = useState([]);
  const [skills, setSkills] = useState([]);
  const [skillsView, setSkillsView] = useState("trending");
  const [skillsMeta, setSkillsMeta] = useState({ snapshot: null, source: "skills.sh", total: 0 });
  const [skillsLimit, setSkillsLimit] = useState(12);
  const [searchText, setSearchText] = useState("");
  const [language, setLanguage] = useState("全部");
  const [period, setPeriod] = useState("weekly");
  const [aiCategory, setAiCategory] = useState("all");
  const [digestOpen, setDigestOpen] = useState(false);
  const [digestText, setDigestText] = useState("");
  const [digestLoading, setDigestLoading] = useState(false);
  const weeklyRef = useRef(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  const debouncedSearch = useMemo(() => searchText.trim(), [searchText]);

  useEffect(() => {
    const timer = setTimeout(() => {
      async function load() {
        const queryLanguage = language === "全部" ? "" : language;
        const keyword = debouncedSearch;

        try {
          const weeklyRes = await API.request(
            `/api/weekly${buildQuery({ language: queryLanguage, q: keyword, limit: "3" })}`
          );
          setWeekly(weeklyRes.data.list || []);
        } catch (error) {
          setWeekly([]);
        }

        try {
          const trendingRes = await API.request(
            `/api/trending${buildQuery({ language: queryLanguage, q: keyword, period })}`
          );
          setTrending(trendingRes.data.list || []);
        } catch (error) {
          setTrending([]);
        }

        try {
          const aiRes = await API.request(
            `/api/ai${buildQuery({ q: keyword, category: aiCategory === "all" ? "" : aiCategory })}`
          );
          setAiItems(aiRes.data.list || []);
        } catch (error) {
          setAiItems([]);
        }
      }
      load();
    }, 300);

    return () => clearTimeout(timer);
  }, [language, period, aiCategory, debouncedSearch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      async function loadSkills() {
        try {
          const res = await API.request(
            `/api/skills${buildQuery({ list: skillsView, q: debouncedSearch, limit: String(skillsLimit) })}`
          );
          setSkills(res.data.list || []);
          setSkillsMeta({
            snapshot: res.data.snapshot_date || null,
            source: res.data.source || "skills.sh",
            total: Number(res.data.total) || 0,
          });
        } catch (error) {
          setSkills([]);
          setSkillsMeta({ snapshot: null, source: "skills.sh", total: 0 });
        }
      }
      loadSkills();
    }, 300);

    return () => clearTimeout(timer);
  }, [skillsView, debouncedSearch, skillsLimit]);

  const weeklyData = weekly;
  const trendingData = trending;
  const aiData = aiItems;
  const skillsData = skills;
  const skillsViewLabel = useMemo(
    () => skillsFilters.find((item) => item.key === skillsView)?.label || "24H 热门",
    [skillsView]
  );

  const heroLeftSpring = useSpring({
    from: { opacity: 0, y: 18 },
    to: { opacity: 1, y: 0 },
    config: { tension: 220, friction: 24 },
    immediate: prefersReducedMotion,
  });

  const heroRightSpring = useSpring({
    from: { opacity: 0, y: 24 },
    to: { opacity: 1, y: 0 },
    delay: 120,
    config: { tension: 220, friction: 26 },
    immediate: prefersReducedMotion,
  });

  const heroFooterSpring = useSpring({
    from: { opacity: 0, y: 16 },
    to: { opacity: 1, y: 0 },
    delay: 220,
    config: { tension: 210, friction: 26 },
    immediate: prefersReducedMotion,
  });

  const weeklyTrail = useTrail(weeklyData.length, {
    from: { opacity: 0, y: 12 },
    to: { opacity: 1, y: 0 },
    trail: 60,
    delay: 120,
    config: { tension: 210, friction: 26 },
    immediate: prefersReducedMotion,
  });

  const trendingTrail = useTrail(trendingData.length, {
    from: { opacity: 0, y: 10 },
    to: { opacity: 1, y: 0 },
    trail: 50,
    delay: 120,
    config: { tension: 210, friction: 26 },
    immediate: prefersReducedMotion,
  });

  const skillsTrail = useTrail(skillsData.length, {
    from: { opacity: 0, y: 10 },
    to: { opacity: 1, y: 0 },
    trail: 45,
    delay: 120,
    config: { tension: 210, friction: 26 },
    immediate: prefersReducedMotion,
  });

  const aiTrail = useTrail(aiData.length, {
    from: { opacity: 0, y: 10 },
    to: { opacity: 1, y: 0 },
    trail: 40,
    delay: 120,
    config: { tension: 210, friction: 26 },
    immediate: prefersReducedMotion,
  });
  const AnimatedDiv = animated.div;

  const skillHighlights = useMemo(() => {
    if (!skillsData.length) return [];
    const maxInstalls = Math.max(...skillsData.map((item) => Number(item.installs) || 0), 1);
    return skillsData.slice(0, 8).map((item) => {
      const installs = Number(item.installs) || 0;
      const heat = clamp(Math.round((installs / maxInstalls) * 100), 18, 100);
      const hasChange = item.change !== null && item.change !== undefined;
      const trend = hasChange
        ? `${item.change >= 0 ? "+" : "-"}${formatCompactNumber(Math.abs(item.change))}`
        : "--";
      const skillPath = buildSkillPath(item);
      const label = item.name || item.skill_id || skillPath;
      return {
        ...item,
        heat,
        trend,
        label,
        skillPath,
      };
    });
  }, [skillsData]);

  const radarPoints = useMemo(() => {
    const now = Date.now();
    const repoItems = trendingData.slice(0, 6).map((item) => {
      const score = Number(item.stars_delta || item.stars || 0);
      return {
        type: "repo",
        label: `${item.owner}/${item.name}`,
        detail: `${formatCompactNumber(item.stars_delta)} 本周`,
        url: item.url,
        score: score > 0 ? score : 1,
      };
    });

    const aiItemsForRadar = aiData.slice(0, 6).map((item) => {
      const publishedAt = item.published_at || item.time;
      let ageHours = 24;
      if (publishedAt) {
        const diff = (now - new Date(publishedAt).getTime()) / 36e5;
        ageHours = Number.isFinite(diff) && diff >= 0 ? diff : 24;
      }
      const score = Math.max(1, 72 - ageHours);
      return {
        type: "ai",
        label: item.title || "未命名资讯",
        detail: item.source || "资讯源",
        url: item.url,
        score,
      };
    });

    const skillsForRadar = skillsData.slice(0, 8).map((item) => {
      const skillPath = buildSkillPath(item);
      const installs = Number(item.installs) || 0;
      const change = Number(item.change) || 0;
      const hasChange = item.change !== null && item.change !== undefined;
      const trend = hasChange
        ? `${item.change >= 0 ? "+" : "-"}${formatCompactNumber(Math.abs(item.change))}`
        : null;
      const score = Math.max(1, installs + Math.max(0, change) * 150);
      const detailParts = [`${formatCompactNumber(installs)} installs`];
      if (trend) detailParts.push(trend);
      return {
        type: "skill",
        label: skillPath,
        detail: detailParts.join(" · "),
        url: item.skill_url,
        score,
      };
    });

    const rawItems = [...repoItems, ...aiItemsForRadar, ...skillsForRadar].filter((item) => item.label);
    if (!rawItems.length) return [];

    const scored = rawItems.map((item) => ({
      ...item,
      rawScore: Math.log10(item.score + 1),
    }));
    const maxScore = Math.max(...scored.map((item) => item.rawScore), 1);

    return scored.map((item, index) => {
      const strength = clamp(item.rawScore / maxScore, 0.2, 1);
      const angleSeed = hashString(`${item.type}-${item.label}`) + index * 47;
      const angle = (angleSeed % 360) * (Math.PI / 180);
      const radius = 16 + strength * 34;
      const x = clamp(50 + radius * Math.cos(angle), 8, 92);
      const y = clamp(50 + radius * Math.sin(angle), 8, 92);
      return {
        ...item,
        x,
        y,
        size: Math.round(7 + strength * 6),
        labelShort: truncateText(item.label, 24),
      };
    });
  }, [trendingData, aiData, skillsData]);

  const handleViewWeekly = () => {
    setPeriod("weekly");
    setLanguage("全部");
    requestAnimationFrame(() => {
      weeklyRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const handleGenerateDigest = async () => {
    try {
      setDigestLoading(true);
      setDigestOpen(true);
      setDigestText("正在生成简报并发送推送，请稍候...");
      const token = API.getToken();
      if (token) {
        const res = await API.request("/api/digest/send", { method: "POST" });
        setDigestText(res.data.text || "");
      } else {
        const res = await API.request(
          `/api/digest/preview${buildQuery({ topics: "weekly,ai", keywords: debouncedSearch })}`
        );
        setDigestText(res.data.text || "");
      }
    } catch (error) {
      setDigestText(`生成失败：${error.message}`);
    } finally {
      setDigestLoading(false);
    }
  };

  const handleConnectRobot = () => {
    window.location.href = "/settings?channel=wecom";
  };

  const handleSearchSubmit = () => {
    setSearchText((prev) => prev.trim());
  };

  return (
    <>
      <Topbar
        variant="home"
        searchValue={searchText}
        onSearchChange={setSearchText}
        onSearchSubmit={handleSearchSubmit}
      />
      <main>
        <section className="hero">
          <AnimatedDiv
            className="hero-left"
            style={{
              opacity: heroLeftSpring.opacity,
              transform: heroLeftSpring.y.to((value) => `translate3d(0, ${value}px, 0)`),
            }}
          >
            <div className="eyebrow">AI 与 Agent 热点</div>
            <h1>把 AI 热点与 Agent 机器人信号汇成一张周报雷达。</h1>
            <p className="hero-copy">
              聚合 GitHub 周榜、AI 资讯与 Agent 工具链的科技前沿驾驶舱。
              用于快速扫读、深度追踪，并支持企微/公众号自动推送。
            </p>
            <div className="hero-actions">
              <button className="primary" onClick={handleViewWeekly}>查看本周</button>
              <button className="ghost" onClick={handleGenerateDigest} disabled={digestLoading}>
                {digestLoading ? "生成中..." : "生成简报"}
              </button>
            </div>
            <div className="hero-stats">
              <div>
                <p className="stat-value">+42%</p>
                <p className="stat-label">热度增速</p>
              </div>
              <div>
                <p className="stat-value">128</p>
                <p className="stat-label">信号追踪</p>
              </div>
              <div>
                <p className="stat-value">08:30</p>
                <p className="stat-label">每日推送</p>
              </div>
            </div>
          </AnimatedDiv>
          <AnimatedDiv
            className="hero-right"
            style={{
              opacity: heroRightSpring.opacity,
              transform: heroRightSpring.y.to((value) => `translate3d(0, ${value}px, 0)`),
            }}
          >
            <div className="radar-card">
              <div className="radar-header">
                <div>
                  <p className="radar-title">信号密度</p>
                  <p className="radar-sub">实时估算</p>
                </div>
                <span className="chip">实时</span>
              </div>
            <div className="radar-graphic">
              <div className="radar-background">
                <div className="ring"></div>
                <div className="ring"></div>
                <div className="ring"></div>
                <div className="sweep"></div>
                {!radarPoints.length && (
                  <div className="radar-empty">暂无信号</div>
                )}
              </div>
                {radarPoints.map((item, index) => {
                  const BlipTag = item.url ? "a" : "div";
                  return (
                    <BlipTag
                      key={`${item.type}-${item.label}-${index}`}
                      className={`radar-blip ${item.type}`}
                      style={{
                        "--x": `${item.x}%`,
                        "--y": `${item.y}%`,
                        "--size": `${item.size}px`,
                      }}
                      data-label={`${item.labelShort} · ${item.detail}`}
                      title={`${item.label} · ${item.detail}`}
                      {...(item.url
                        ? { href: item.url, target: "_blank", rel: "noreferrer" }
                        : { role: "img", "aria-label": item.label })}
                    >
                      <span className="radar-pulse"></span>
                    </BlipTag>
                  );
                })}
              </div>
              <div className="radar-foot">
                <p>
                  下次更新 <strong>17 分钟</strong>
                </p>
                <button className="ghost small">打开流</button>
              </div>
            </div>
          </AnimatedDiv>
          <AnimatedDiv
            className="hero-footer"
            style={{
              opacity: heroFooterSpring.opacity,
              transform: heroFooterSpring.y.to((value) => `translate3d(0, ${value}px, 0)`),
            }}
          >
            <div className="radar-insights">
              <div className="radar-insights-head">
                <p className="radar-title small">热门 Skills</p>
                <span className="chip muted">24H 热度榜</span>
              </div>
              <div className="radar-insight-list">
                {skillHighlights.map((item) => (
                  <div className="radar-insight" key={`${item.source}-${item.skill_id}`}>
                    <div className="radar-insight-row">
                      <span className="radar-insight-title">{truncateText(item.label, 18)}</span>
                      <span className="radar-insight-trend">{item.trend}</span>
                    </div>
                    <div className="radar-insight-bar">
                      <span style={{ width: `${item.heat}%` }}></span>
                    </div>
                    <div className="radar-insight-tags">
                      <span>{`#${String(item.rank || 0).padStart(2, "0")}`}</span>
                      {(item.skillPath || item.source) && (
                        <span>{truncateText(item.skillPath || item.source, 26)}</span>
                      )}
                      <span>{`${formatCompactNumber(item.installs)} installs`}</span>
                    </div>
                  </div>
                ))}
                {!skillHighlights.length && (
                  <div className="radar-insight-empty">暂无技能热度</div>
                )}
              </div>
            </div>
          </AnimatedDiv>
        </section>

        <section id="weekly" className="weekly" ref={weeklyRef}>
          <div className="section-head">
            <div>
              <p className="section-title">每周热度指数</p>
              <p className="section-sub">跨语言与框架的热度动量排行。</p>
            </div>
            <div className="filters">
              {languageFilters.map((item) => (
                <button
                  key={item}
                  className={`filter ${language === item ? "active" : ""}`}
                  onClick={() => setLanguage(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
          <div className="weekly-grid">
            {weeklyTrail.map((style, index) => {
              const item = weeklyData[index];
              if (!item) return null;
              const title = `${item.owner}/${item.name}`;
              const desc = item.description || "暂无描述";
              const delta = `+${formatCompactNumber(item.stars_delta)}`;
              const repoUrl = item.url;
              const tags = [item.language || "AI", "Weekly", "Trending"];
              return (
                <AnimatedDiv
                  key={`${title}-${index}`}
                  className={`weekly-card ${index === 1 ? "featured" : ""}`}
                  style={{
                    opacity: style.opacity,
                    transform: style.y.to((value) => `translate3d(0, ${value}px, 0)`),
                  }}
                >
                  <div className="weekly-meta">
                    <p className="weekly-rank">#{String(index + 1).padStart(2, "0")}</p>
                    <span className="chip">{delta}</span>
                  </div>
                  <h3>
                    {repoUrl ? (
                      <a className="link-title" href={repoUrl} target="_blank" rel="noreferrer">
                        {title}
                      </a>
                    ) : (
                      title
                    )}
                  </h3>
                  <p className="weekly-desc">{desc}</p>
                  <div className="weekly-tags">
                    {tags.map((tag) => (
                      <span key={`${title}-${tag}`}>{tag}</span>
                    ))}
                  </div>
                  {repoUrl && (
                    <div className="source-links">
                      <a href={repoUrl} target="_blank" rel="noreferrer">GitHub</a>
                    </div>
                  )}
                </AnimatedDiv>
              );
            })}
          </div>
          {!weeklyData.length && (
            <p className="empty-state">暂无匹配的周度热度数据</p>
          )}
        </section>

        <section id="trending" className="trending">
          <div className="section-head">
            <div>
              <p className="section-title">趋势仓库排行</p>
              <p className="section-sub">按周度势能排序，而非原始星标。</p>
            </div>
            <div className="segment">
              {periodFilters.map((item) => (
                <button
                  key={item.key}
                  className={`segment-btn ${period === item.key ? "active" : ""}`}
                  onClick={() => setPeriod(item.key)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <div className="trending-list">
            {trendingTrail.map((style, index) => {
              const item = trendingData[index];
              if (!item) return null;
              const repoUrl = item.url;
              return (
                <AnimatedDiv
                  className="trending-card"
                  key={`${item.owner}-${item.name}`}
                  style={{
                    opacity: style.opacity,
                    transform: style.y.to((value) => `translate3d(0, ${value}px, 0)`),
                  }}
                >
                  <div className="trending-rank">#{String(index + 1).padStart(2, "0")}</div>
                  <div className="trending-meta">
                    <h3>
                      {repoUrl ? (
                        <a className="link-title" href={repoUrl} target="_blank" rel="noreferrer">
                          {item.owner}/{item.name}
                        </a>
                      ) : (
                        `${item.owner}/${item.name}`
                      )}
                    </h3>
                    <p>{item.description || "暂无描述"}</p>
                    {repoUrl && (
                      <div className="source-links">
                        <a href={repoUrl} target="_blank" rel="noreferrer">GitHub</a>
                      </div>
                    )}
                  </div>
                  <div className="trending-stats">
                    <span>{item.language || "未知"}</span>
                    <span>{formatCompactNumber(item.stars)} 星标</span>
                    <span>+{formatCompactNumber(item.stars_delta)} 本周</span>
                  </div>
                </AnimatedDiv>
              );
            })}
          </div>
          {!trendingData.length && (
            <p className="empty-state">暂无匹配的仓库数据</p>
          )}
        </section>

        <section id="skills" className="skills">
          <div className="section-head">
            <div>
              <p className="section-title">热门 Skills</p>
              <p className="section-sub">
                {skillsMeta.snapshot ? `数据日期 ${skillsMeta.snapshot}` : "实时抓取的技能热度榜。"}
              </p>
            </div>
            <div className="segment">
              {skillsFilters.map((item) => (
                <button
                  key={item.key}
                  className={`segment-btn ${skillsView === item.key ? "active" : ""}`}
                  onClick={() => setSkillsView(item.key)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <div className="skills-grid">
            {skillsTrail.map((style, index) => {
              const item = skillsData[index];
              if (!item) return null;
              const changeText = item.change !== null && item.change !== undefined
                ? `${item.change >= 0 ? "+" : "-"}${formatCompactNumber(Math.abs(item.change))}`
                : "--";
              const skillTitle = item.name || item.skill_id || "未命名 Skill";
              const skillPath = buildSkillPath(item);
              return (
              <AnimatedDiv
                className="skill-card"
                key={`${item.source}-${item.skill_id}`}
                style={{
                  opacity: style.opacity,
                  transform: style.y.to((value) => `translate3d(0, ${value}px, 0)`),
                }}
              >
                <div className="skill-head">
                  <div>
                    <p className="skill-title">{skillTitle}</p>
                    <p className="skill-desc">{skillPath}</p>
                  </div>
                  <div className="skill-score">
                    <span className="score-value">{formatCompactNumber(item.installs)}</span>
                    <span className="score-label">Installs</span>
                  </div>
                </div>
                <div className="skill-metrics">
                  <div>
                    <span className="metric-label">排名</span>
                    <strong className="metric-value">#{String(item.rank || 0).padStart(2, "0")}</strong>
                  </div>
                  <div>
                    <span className="metric-label">变化</span>
                    <strong className="metric-value">{changeText}</strong>
                  </div>
                  <div>
                    <span className="metric-label">榜单</span>
                    <strong className="metric-value">{skillsViewLabel}</strong>
                  </div>
                </div>
                <div className="skill-focus">
                  {item.skill_id && <span>{item.skill_id}</span>}
                  {item.source && <span>{item.source}</span>}
                </div>
                <div className="skill-list">
                  {item.skill_url && (
                    <a className="skill-pill" href={item.skill_url} target="_blank" rel="noreferrer">
                      Skill 详情
                    </a>
                  )}
                  {item.repo_url && (
                    <a className="skill-pill" href={item.repo_url} target="_blank" rel="noreferrer">
                      GitHub Repo
                    </a>
                  )}
                </div>
              </AnimatedDiv>
            )})}
          </div>
          <div className="skills-actions">
            {(skillsMeta.total ? skillsData.length < skillsMeta.total : skillsData.length >= skillsLimit) && (
              <button
                className="ghost"
                onClick={() => setSkillsLimit((prev) => Math.min(prev + 12, 60))}
              >
                查看更多
              </button>
            )}
            {skillsLimit > 12 && (
              <button className="ghost" onClick={() => setSkillsLimit(12)}>
                收起
              </button>
            )}
          </div>
          {!skillsData.length && (
            <p className="empty-state">暂无匹配的技能榜单</p>
          )}
        </section>

        <section id="ai" className="ai">
          <div className="section-head">
            <div>
              <p className="section-title">AI 雷达流</p>
              <p className="section-sub">研究、工具、Agent 生态与平台动态。</p>
            </div>
            <div className="filters">
              {aiFilters.map((item) => (
                <button
                  key={item.key}
                  className={`filter ${aiCategory === item.key ? "active" : ""}`}
                  onClick={() => setAiCategory(item.key)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <div className="ai-feed">
            {aiTrail.map((style, index) => {
              const item = aiData[index];
              if (!item) return null;
              return (
                <AnimatedDiv
                  className="ai-item"
                  key={`${item.title}-${index}`}
                  style={{
                    opacity: style.opacity,
                    transform: style.y.to((value) => `translate3d(0, ${value}px, 0)`),
                  }}
                >
                  <div className="ai-time">{formatTime(item.published_at || item.time)}</div>
                  <div>
                    <div className="ai-title">
                      {item.url ? (
                        <a className="link-title" href={item.url} target="_blank" rel="noreferrer">
                          {item.title}
                        </a>
                      ) : (
                        item.title
                      )}
                    </div>
                    <div className="ai-sub">{item.source}</div>
                    {item.url && (
                      <div className="source-links">
                        <a href={item.url} target="_blank" rel="noreferrer">原文</a>
                      </div>
                    )}
                  </div>
                  <div className="ai-tag">{classifyAiTag(item)}</div>
                </AnimatedDiv>
              );
            })}
          </div>
          {!aiData.length && (
            <p className="empty-state">暂无匹配 AI 资讯</p>
          )}
        </section>

        <section id="push" className="push">
          <div className="push-card">
            <div>
              <p className="section-title">企微/公众号早报推送</p>
              <p className="section-sub">自动打包每周热度 + AI 信息流。</p>
            </div>
            <div className="push-meta">
              <div>
                <p className="stat-value">07:45</p>
                <p className="stat-label">推送时间</p>
              </div>
              <div>
                <p className="stat-value">3 分钟</p>
                <p className="stat-label">构建耗时</p>
              </div>
              <button className="primary" onClick={handleConnectRobot}>连接机器人</button>
            </div>
          </div>
        </section>
      </main>
      <footer className="footer">
        <p>来源：GitHub Trending、精选 AI 资讯源、自定义评分。面向多端性能优化。</p>
      </footer>

      {digestOpen && (
        <div className="modal-mask" role="dialog" aria-modal="true">
          <div className="modal">
            <div className="modal-head">
              <div>
                <p className="section-title">AI 机器人周报 · 预览</p>
                <p className="section-sub">
                  {API.getToken() ? "已生成并触发一次测试推送" : "预览模式（登录后可一键推送）"}
                </p>
              </div>
              <button className="ghost small" onClick={() => setDigestOpen(false)}>关闭</button>
            </div>
            <pre className="modal-body">
              {digestLoading ? "生成中，请稍候..." : (digestText || "暂无内容")}
            </pre>
            <div className="modal-actions">
              <button
                className="ghost"
                onClick={async () => {
                  await navigator.clipboard.writeText(digestText || "");
                  alert("已复制到剪贴板");
                }}
              >
                复制内容
              </button>
              <button className="primary" onClick={handleConnectRobot}>
                {API.getToken() ? "管理推送通道" : "去绑定推送"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
