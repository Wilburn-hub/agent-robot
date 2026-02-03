import { useEffect, useState } from "react";
import Topbar from "../components/Topbar";
import { API } from "../lib/api";

const fallbackTrending = [
  {
    rank: "01",
    name: "nova-vision",
    desc: "支持边缘推理的实时多模态 Agent 框架。",
    lang: "TypeScript",
    stars: "32.8k",
    delta: "+2.4k",
  },
  {
    rank: "02",
    name: "atlas-q",
    desc: "面向端侧推理管线的量化 LLM 工具箱。",
    lang: "Python",
    stars: "21.1k",
    delta: "+1.8k",
  },
  {
    rank: "03",
    name: "grid-ops",
    desc: "支持碳感知路由的 GPU 集群调度系统。",
    lang: "Go",
    stars: "18.7k",
    delta: "+1.4k",
  },
  {
    rank: "04",
    name: "spectra-craft",
    desc: "具备一致角色控制的生成式视频引擎。",
    lang: "Rust",
    stars: "15.9k",
    delta: "+1.1k",
  },
];

const fallbackAi = [
  { time: "09:20", title: "长上下文检索基准发布", source: "研究", tag: "研究" },
  { time: "08:45", title: "边缘 Agent 运行时吞吐提升 2 倍", source: "开源", tag: "开源" },
  { time: "08:05", title: "多模态安全过滤器发布", source: "产品", tag: "产品" },
  { time: "07:50", title: "Prompt 编排 DSL 正式开源", source: "研究", tag: "研究" },
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

export default function Home() {
  const [trending, setTrending] = useState([]);
  const [aiItems, setAiItems] = useState([]);

  useEffect(() => {
    async function load() {
      try {
        const trendingRes = await API.request("/api/trending");
        setTrending(trendingRes.data.list || []);
      } catch (error) {
        setTrending([]);
      }
      try {
        const aiRes = await API.request("/api/ai");
        setAiItems(aiRes.data.list || []);
      } catch (error) {
        setAiItems([]);
      }
    }
    load();
  }, []);

  const trendingData = trending.length ? trending : fallbackTrending;
  const aiData = aiItems.length ? aiItems : fallbackAi;

  return (
    <>
      <Topbar variant="home" />
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
              <button className="primary">查看本周</button>
              <button className="ghost">生成简报</button>
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

        <section id="weekly" className="weekly">
          <div className="section-head">
            <div>
              <p className="section-title">每周热度指数</p>
              <p className="section-sub">跨语言与框架的热度动量排行。</p>
            </div>
            <div className="filters">
              <button className="filter active">全部</button>
              <button className="filter">TypeScript</button>
              <button className="filter">Python</button>
              <button className="filter">Rust</button>
            </div>
          </div>
          <div className="weekly-grid">
            <div className="weekly-card">
              <div className="weekly-meta">
                <p className="weekly-rank">#01</p>
                <span className="chip">+2,831</span>
              </div>
              <h3>cosmic-rag</h3>
              <p className="weekly-desc">RAG 管线升级：多 Agent 协作 + 长上下文追踪。</p>
              <div className="weekly-tags">
                <span>Rust</span>
                <span>Agents</span>
                <span>Infra</span>
              </div>
            </div>
            <div className="weekly-card featured">
              <div className="weekly-meta">
                <p className="weekly-rank">#02</p>
                <span className="chip">+2,002</span>
              </div>
              <h3>reactor-ops</h3>
              <p className="weekly-desc">边缘 AI 运维驾驶舱：日志、告警、模型热区。</p>
              <div className="weekly-tags">
                <span>TypeScript</span>
                <span>Edge</span>
                <span>Telemetry</span>
              </div>
            </div>
            <div className="weekly-card">
              <div className="weekly-meta">
                <p className="weekly-rank">#03</p>
                <span className="chip">+1,472</span>
              </div>
              <h3>quantum-cache</h3>
              <p className="weekly-desc">超低延迟 LLM Cache：混合向量 + KV 策略。</p>
              <div className="weekly-tags">
                <span>Go</span>
                <span>LLM</span>
                <span>Storage</span>
              </div>
            </div>
          </div>
        </section>

        <section id="trending" className="trending">
          <div className="section-head">
            <div>
              <p className="section-title">趋势仓库排行</p>
              <p className="section-sub">按周度势能排序，而非原始星标。</p>
            </div>
            <div className="segment">
              <button className="segment-btn active">本周</button>
              <button className="segment-btn">上周</button>
              <button className="segment-btn">30 天</button>
            </div>
          </div>
          <div className="trending-list">
            {trendingData.map((item, index) => {
              if (item.owner) {
                return (
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
                );
              }
              return (
                <div className="trending-card" key={item.rank}>
                  <div className="trending-rank">#{item.rank}</div>
                  <div className="trending-meta">
                    <h3>{item.name}</h3>
                    <p>{item.desc}</p>
                  </div>
                  <div className="trending-stats">
                    <span>{item.lang}</span>
                    <span>{item.stars} 星标</span>
                    <span>{item.delta} 本周</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section id="ai" className="ai">
          <div className="section-head">
            <div>
              <p className="section-title">AI 雷达流</p>
              <p className="section-sub">研究、工具、Agent 生态与平台动态。</p>
            </div>
            <div className="filters">
              <button className="filter active">全部</button>
              <button className="filter">研究</button>
              <button className="filter">产品</button>
              <button className="filter">开源</button>
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
                <div className="ai-tag">{item.tag || "AI"}</div>
              </div>
            ))}
          </div>
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
              <button className="primary">连接机器人</button>
            </div>
          </div>
        </section>
      </main>
      <footer className="footer">
        <p>来源：GitHub Trending、精选 AI 资讯源、自定义评分。面向多端性能优化。</p>
      </footer>
    </>
  );
}
