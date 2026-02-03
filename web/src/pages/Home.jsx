import { useEffect, useMemo, useRef, useState } from "react";
import Topbar from "../components/Topbar";
import { API } from "../lib/api";


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
  const [searchText, setSearchText] = useState("");
  const [language, setLanguage] = useState("全部");
  const [period, setPeriod] = useState("weekly");
  const [aiCategory, setAiCategory] = useState("all");
  const [digestOpen, setDigestOpen] = useState(false);
  const [digestText, setDigestText] = useState("");
  const [digestLoading, setDigestLoading] = useState(false);
  const weeklyRef = useRef(null);

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

  const weeklyData = weekly;
  const trendingData = trending;
  const aiData = aiItems;

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
      if (API.getToken()) {
        setDigestText("");
      }
      const token = API.getToken();
      if (token) {
        const res = await API.request("/api/digest/send", { method: "POST" });
        setDigestText(res.data.text || "");
        setDigestOpen(true);
      } else {
        const res = await API.request(
          `/api/digest/preview${buildQuery({ topics: "weekly,ai", keywords: debouncedSearch })}`
        );
        setDigestText(res.data.text || "");
        setDigestOpen(true);
      }
    } catch (error) {
      alert(error.message);
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
          <div className="hero-left">
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
          </div>
          <div className="hero-right">
            <div className="radar-card">
              <div className="radar-header">
                <div>
                  <p className="radar-title">信号密度</p>
                  <p className="radar-sub">实时估算</p>
                </div>
                <span className="chip">实时</span>
              </div>
              <div className="radar-graphic">
                <div className="ring"></div>
                <div className="ring"></div>
                <div className="ring"></div>
                <div className="sweep"></div>
                <div className="blip blip-1"></div>
                <div className="blip blip-2"></div>
                <div className="blip blip-3"></div>
              </div>
              <div className="radar-foot">
                <p>
                  下次更新 <strong>17 分钟</strong>
                </p>
                <button className="ghost small">打开流</button>
              </div>
            </div>
          </div>
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
            {weeklyData.map((item, index) => {
              const title = `${item.owner}/${item.name}`;
              const desc = item.description || "暂无描述";
              const delta = `+${formatCompactNumber(item.stars_delta)}`;
              const tags = [item.language || "AI", "Weekly", "Trending"];
              return (
                <div key={`${title}-${index}`} className={`weekly-card ${index === 1 ? "featured" : ""}`}>
                  <div className="weekly-meta">
                    <p className="weekly-rank">#{String(index + 1).padStart(2, "0")}</p>
                    <span className="chip">{delta}</span>
                  </div>
                  <h3>{title}</h3>
                  <p className="weekly-desc">{desc}</p>
                  <div className="weekly-tags">
                    {tags.map((tag) => (
                      <span key={`${title}-${tag}`}>{tag}</span>
                    ))}
                  </div>
                </div>
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
            {trendingData.map((item, index) => (
              <div className="trending-card" key={`${item.owner}-${item.name}`}>
                <div className="trending-rank">#{String(index + 1).padStart(2, "0")}</div>
                <div className="trending-meta">
                  <h3>{item.owner}/{item.name}</h3>
                  <p>{item.description || "暂无描述"}</p>
                </div>
                <div className="trending-stats">
                  <span>{item.language || "未知"}</span>
                  <span>{formatCompactNumber(item.stars)} 星标</span>
                  <span>+{formatCompactNumber(item.stars_delta)} 本周</span>
                </div>
              </div>
            ))}
          </div>
          {!trendingData.length && (
            <p className="empty-state">暂无匹配的仓库数据</p>
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
            {aiData.map((item, index) => (
              <div className="ai-item" key={`${item.title}-${index}`}>
                <div className="ai-time">{formatTime(item.published_at || item.time)}</div>
                <div>
                  <div className="ai-title">{item.title}</div>
                  <div className="ai-sub">{item.source}</div>
                </div>
                <div className="ai-tag">{classifyAiTag(item)}</div>
              </div>
            ))}
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
            <pre className="modal-body">{digestText || "暂无内容"}</pre>
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
