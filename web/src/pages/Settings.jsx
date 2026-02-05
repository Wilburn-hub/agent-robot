import { useEffect, useRef, useState } from "react";
import Topbar from "../components/Topbar";
import { API } from "../lib/api";

const defaultTopics = [
  { key: "weekly", label: "本周热度" },
  { key: "ai", label: "AI 资讯" },
  { key: "trending", label: "趋势排行" },
  { key: "papers", label: "研究论文" },
  { key: "skills", label: "Skills 热度" },
];

export default function Settings() {
  const [account, setAccount] = useState({ name: "", email: "", github: "未绑定" });
  const [schedule, setSchedule] = useState({ time: "08:30", timezone: "Asia/Shanghai", frequency: "daily" });
  const [content, setContent] = useState({
    topics: ["weekly", "ai"],
    keywords: "",
    aiLimit: 20,
    trendingLimit: 5,
    papersLimit: 5,
    skillsType: "trending",
    skillsLimit: 8,
  });
  const [wecom, setWecom] = useState({ name: "", webhook: "", active: true });
  const [feishu, setFeishu] = useState({ name: "", webhook: "", secret: "", active: true });
  const [wechat, setWechat] = useState({ appId: "", appSecret: "", templateId: "", openids: "", templateJson: "", active: true });
  const [activeChannel, setActiveChannel] = useState("wecom");
  const [sources, setSources] = useState([]);
  const [defaultSources, setDefaultSources] = useState([]);
  const channelRef = useRef(null);

  useEffect(() => {
    async function load() {
      try {
        const me = await API.request("/api/auth/me");
        setAccount({
          name: me.data.name || "",
          email: me.data.email || "",
          github: me.data.githubId ? "已绑定" : "未绑定",
        });
      } catch (error) {
        window.location.href = "/auth";
        return;
      }

      try {
        const res = await API.request("/api/settings");
        const { schedule: scheduleData, channels, sources: sourceList, defaultSources: defaults } = res.data;
        if (scheduleData) {
          setSchedule({
            time: scheduleData.time || "08:30",
            timezone: scheduleData.timezone || "Asia/Shanghai",
            frequency: scheduleData.frequency || "daily",
          });
          if (scheduleData.content_json) {
            const parsed = JSON.parse(scheduleData.content_json);
            setContent({
              topics: parsed.topics || ["weekly", "ai"],
              keywords: parsed.keywords || "",
              aiLimit: parsed.aiLimit || 20,
              trendingLimit: parsed.trendingLimit || 5,
              papersLimit: parsed.papersLimit || 5,
              skillsType: parsed.skillsType || "trending",
              skillsLimit: parsed.skillsLimit || 8,
            });
          }
        }

        const wecomChannel = channels.find((item) => item.type === "wecom");
        if (wecomChannel) {
          setWecom({
            name: wecomChannel.name || "",
            webhook: wecomChannel.webhook || "",
            active: Boolean(wecomChannel.active),
          });
        }

        const feishuChannel = channels.find((item) => item.type === "feishu");
        if (feishuChannel) {
          setFeishu({
            name: feishuChannel.name || "",
            webhook: feishuChannel.webhook || "",
            secret: feishuChannel.secret || "",
            active: Boolean(feishuChannel.active),
          });
        }

        const wechatChannel = channels.find((item) => item.type === "wechat");
        if (wechatChannel) {
          setWechat({
            appId: wechatChannel.app_id || "",
            appSecret: wechatChannel.app_secret || "",
            templateId: wechatChannel.template_id || "",
            openids: wechatChannel.openids || "",
            templateJson: wechatChannel.template_json || "",
            active: Boolean(wechatChannel.active),
          });
        }

        setSources(
          Array.isArray(sourceList) && sourceList.length
            ? sourceList.map((item) => ({
                name: item.name || "",
                url: item.url || "",
                active: Boolean(item.active),
                type: item.type || "rss",
              }))
            : []
        );
        setDefaultSources(Array.isArray(defaults) ? defaults : []);
      } catch (error) {
        alert(error.message);
      }
    }
    load();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const channel = params.get("channel");
    if (channel === "wechat" || channel === "wecom" || channel === "feishu") {
      setActiveChannel(channel);
      setTimeout(() => {
        channelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 200);
    }
  }, []);

  const toggleTopic = (key) => {
    setContent((prev) => {
      const exists = prev.topics.includes(key);
      return {
        ...prev,
        topics: exists ? prev.topics.filter((item) => item !== key) : [...prev.topics, key],
      };
    });
  };

  const saveAccount = async () => {
    try {
      await API.request("/api/auth/me", {
        method: "PUT",
        body: JSON.stringify({ name: account.name, email: account.email }),
      });
      alert("账号信息已更新");
    } catch (error) {
      alert(error.message);
    }
  };

  const saveSchedule = async () => {
    try {
      await API.request("/api/settings", {
        method: "PUT",
        body: JSON.stringify({
          time: schedule.time,
          timezone: schedule.timezone,
          frequency: schedule.frequency,
          content,
        }),
      });
      alert("设置已保存");
    } catch (error) {
      alert(error.message);
    }
  };

  const addSource = () => {
    setSources((prev) => [
      ...prev,
      { name: "", url: "", active: true, type: "rss" },
    ]);
  };

  const updateSource = (index, patch) => {
    setSources((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, ...patch } : item))
    );
  };

  const removeSource = (index) => {
    setSources((prev) => prev.filter((_, idx) => idx !== index));
  };

  const importDefaultSources = () => {
    if (!defaultSources.length) return;
    setSources(
      defaultSources.map((item) => ({
        name: item.name || "",
        url: item.url || "",
        active: true,
        type: "rss",
      }))
    );
  };

  const saveSources = async () => {
    try {
      await API.request("/api/sources", {
        method: "PUT",
        body: JSON.stringify({ sources }),
      });
      alert("信息源已保存");
    } catch (error) {
      alert(error.message);
    }
  };

  const saveWecom = async () => {
    try {
      await API.request("/api/channels/wecom", {
        method: "POST",
        body: JSON.stringify(wecom),
      });
      alert("企微通道已保存");
    } catch (error) {
      alert(error.message);
    }
  };

  const saveWechat = async () => {
    try {
      await API.request("/api/channels/wechat", {
        method: "POST",
        body: JSON.stringify({
          name: "微信公众号",
          appId: wechat.appId,
          appSecret: wechat.appSecret,
          templateId: wechat.templateId,
          openids: wechat.openids,
          templateJson: wechat.templateJson,
          active: wechat.active,
        }),
      });
      alert("公众号通道已保存");
    } catch (error) {
      alert(error.message);
    }
  };

  const saveFeishu = async () => {
    try {
      await API.request("/api/channels/feishu", {
        method: "POST",
        body: JSON.stringify({
          name: feishu.name,
          webhook: feishu.webhook,
          secret: feishu.secret,
          active: feishu.active,
        }),
      });
      alert("飞书通道已保存");
    } catch (error) {
      alert(error.message);
    }
  };

  const [testLoading, setTestLoading] = useState("");

  const testChannel = async (type) => {
    setTestLoading(type);
    try {
      await API.request(`/api/channels/${type}/test`, { method: "POST" });
      alert("测试推送已发送");
    } catch (error) {
      alert(error.message);
    } finally {
      setTestLoading("");
    }
  };

  return (
    <>
      <Topbar variant="settings" />
      <main className="settings-page">
        <section className="settings-hero">
          <div>
            <p className="section-title">推送与账号设置</p>
            <p className="section-sub">为你的账户绑定专属推送通道，选择推送时间、内容与优先级。</p>
          </div>
          <div className="hero-stats">
            <div>
              <p className="stat-value">3</p>
              <p className="stat-label">可用通道</p>
            </div>
            <div>
              <p className="stat-value">已登录</p>
              <p className="stat-label">状态正常</p>
            </div>
          </div>
        </section>

        <section className="settings-grid">
          <div className="panel">
            <p className="panel-title">账号与安全</p>
            <p className="panel-sub">管理邮箱、GitHub 授权与登录方式。</p>
            <div className="field">
              <label>昵称</label>
              <input
                type="text"
                placeholder="你的显示名称"
                value={account.name}
                onChange={(event) => setAccount({ ...account, name: event.target.value })}
              />
            </div>
            <div className="field">
              <label>邮箱</label>
              <input
                type="email"
                value={account.email}
                onChange={(event) => setAccount({ ...account, email: event.target.value })}
              />
            </div>
            <div className="field">
              <label>GitHub OAuth</label>
              <input type="text" value={account.github} readOnly />
            </div>
            <div className="form-actions">
              <button className="ghost" type="button">重置密码</button>
              <button className="primary" type="button" onClick={saveAccount}>保存账号</button>
            </div>
          </div>

          <div className="panel" ref={channelRef}>
            <p className="panel-title">推送渠道</p>
            <p className="panel-sub">为每个用户绑定自己的企微机器人、飞书机器人或公众号。</p>
            <div className="panel-help">
              <div>
                <p className="help-title">不知道怎么填？</p>
                <p className="help-sub">查看企微机器人与公众号推送的配置教程与官方链接。</p>
              </div>
              <a className="ghost small" href="/push-channels.html" target="_blank" rel="noreferrer">
                查看教程
              </a>
            </div>
            <div className="tab-switch">
              <button
                className={activeChannel === "wecom" ? "active" : ""}
                onClick={() => setActiveChannel("wecom")}
              >
                企微机器人
              </button>
              <button
                className={activeChannel === "feishu" ? "active" : ""}
                onClick={() => setActiveChannel("feishu")}
              >
                飞书机器人
              </button>
              <button
                className={activeChannel === "wechat" ? "active" : ""}
                onClick={() => setActiveChannel("wechat")}
              >
                公众号推送
              </button>
            </div>

            <div className={`tab-panel ${activeChannel === "wecom" ? "active" : ""}`}>
              <div className="field">
                <label>Webhook 地址</label>
                <input
                  type="text"
                  placeholder="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=..."
                  value={wecom.webhook}
                  onChange={(event) => setWecom({ ...wecom, webhook: event.target.value })}
                />
              </div>
              <div className="field-row">
                <div className="field">
                  <label>备注名称</label>
                  <input
                    type="text"
                    placeholder="每日简报群"
                    value={wecom.name}
                    onChange={(event) => setWecom({ ...wecom, name: event.target.value })}
                  />
                </div>
                <div className="field">
                  <label>启用状态</label>
                  <select
                    value={wecom.active ? "启用" : "暂停"}
                    onChange={(event) => setWecom({ ...wecom, active: event.target.value === "启用" })}
                  >
                    <option>启用</option>
                    <option>暂停</option>
                  </select>
                </div>
              </div>
              <div className="form-actions">
                <button
                  className="ghost"
                  type="button"
                  onClick={() => testChannel("wecom")}
                  disabled={Boolean(testLoading)}
                >
                  {testLoading === "wecom" ? "推送中..." : "测试推送"}
                </button>
                <button className="primary" type="button" onClick={saveWecom}>保存通道</button>
              </div>
            </div>

            <div className={`tab-panel ${activeChannel === "feishu" ? "active" : ""}`}>
              <div className="field">
                <label>Webhook 地址</label>
                <input
                  type="text"
                  placeholder="https://open.feishu.cn/open-apis/bot/v2/hook/..."
                  value={feishu.webhook}
                  onChange={(event) => setFeishu({ ...feishu, webhook: event.target.value })}
                />
              </div>
              <div className="field">
                <label>签名密钥（可选）</label>
                <input
                  type="password"
                  placeholder="机器人安全设置中的密钥"
                  value={feishu.secret}
                  onChange={(event) => setFeishu({ ...feishu, secret: event.target.value })}
                />
              </div>
              <div className="field-row">
                <div className="field">
                  <label>备注名称</label>
                  <input
                    type="text"
                    placeholder="飞书日报群"
                    value={feishu.name}
                    onChange={(event) => setFeishu({ ...feishu, name: event.target.value })}
                  />
                </div>
                <div className="field">
                  <label>启用状态</label>
                  <select
                    value={feishu.active ? "启用" : "暂停"}
                    onChange={(event) => setFeishu({ ...feishu, active: event.target.value === "启用" })}
                  >
                    <option>启用</option>
                    <option>暂停</option>
                  </select>
                </div>
              </div>
              <div className="form-actions">
                <button
                  className="ghost"
                  type="button"
                  onClick={() => testChannel("feishu")}
                  disabled={Boolean(testLoading)}
                >
                  {testLoading === "feishu" ? "推送中..." : "测试推送"}
                </button>
                <button className="primary" type="button" onClick={saveFeishu}>保存通道</button>
              </div>
            </div>

            <div className={`tab-panel ${activeChannel === "wechat" ? "active" : ""}`}>
              <div className="note">公众号推送需要管理员权限，并完成授权、模板消息与 OpenID 配置。</div>
              <div className="field">
                <label>AppID</label>
                <input
                  type="text"
                  placeholder="微信公众号 AppID"
                  value={wechat.appId}
                  onChange={(event) => setWechat({ ...wechat, appId: event.target.value })}
                />
              </div>
              <div className="field">
                <label>AppSecret</label>
                <input
                  type="password"
                  placeholder="公众号 Secret"
                  value={wechat.appSecret}
                  onChange={(event) => setWechat({ ...wechat, appSecret: event.target.value })}
                />
              </div>
              <div className="field">
                <label>模板消息 ID</label>
                <input
                  type="text"
                  placeholder="模板消息 ID"
                  value={wechat.templateId}
                  onChange={(event) => setWechat({ ...wechat, templateId: event.target.value })}
                />
              </div>
              <div className="field">
                <label>OpenID 列表</label>
                <input
                  type="text"
                  placeholder="多个 OpenID 用英文逗号分隔"
                  value={wechat.openids}
                  onChange={(event) => setWechat({ ...wechat, openids: event.target.value })}
                />
              </div>
              <div className="field">
                <label>模板数据 JSON（可选）</label>
                <textarea
                  rows="4"
                  placeholder='{"title":{"value":"AI 机器人周报"}}'
                  value={wechat.templateJson}
                  onChange={(event) => setWechat({ ...wechat, templateJson: event.target.value })}
                ></textarea>
              </div>
              <div className="field">
                <label>启用状态</label>
                <select
                  value={wechat.active ? "启用" : "暂停"}
                  onChange={(event) => setWechat({ ...wechat, active: event.target.value === "启用" })}
                >
                  <option>启用</option>
                  <option>暂停</option>
                </select>
              </div>
              <div className="form-actions">
                <button className="ghost" type="button">发起授权</button>
                <button className="primary" type="button" onClick={saveWechat}>保存通道</button>
              </div>
            </div>
          </div>

          <div className="panel">
            <p className="panel-title">推送时间</p>
            <p className="panel-sub">支持按用户自定义时间推送。</p>
            <div className="field">
              <label>每天推送时间</label>
              <input
                type="time"
                value={schedule.time}
                onChange={(event) => setSchedule({ ...schedule, time: event.target.value })}
              />
            </div>
            <div className="field">
              <label>时区</label>
              <select
                value={schedule.timezone}
                onChange={(event) => setSchedule({ ...schedule, timezone: event.target.value })}
              >
                <option value="Asia/Shanghai">Asia/Shanghai</option>
                <option value="UTC">UTC</option>
              </select>
            </div>
            <div className="field">
              <label>频率</label>
              <select
                value={schedule.frequency}
                onChange={(event) => setSchedule({ ...schedule, frequency: event.target.value })}
              >
                <option value="daily">每日</option>
                <option value="weekday">每周工作日</option>
                <option value="weekly">每周一</option>
              </select>
            </div>
          </div>

          <div className="panel">
            <p className="panel-title">信息源配置</p>
            <p className="panel-sub">为每个用户配置自己的 RSS 信息源（默认有内置源）。</p>
            {!sources.length ? (
              <div className="note">当前未设置自定义源，将使用系统默认源。</div>
            ) : null}
            <div className="field-row">
              <button className="ghost" type="button" onClick={addSource}>新增 RSS</button>
              <button className="ghost" type="button" onClick={importDefaultSources}>导入默认源</button>
            </div>
            <div className="source-list">
              {sources.map((source, index) => (
                <div className="source-item" key={`${source.url}-${index}`}>
                  <div className="field">
                    <label>名称</label>
                    <input
                      type="text"
                      placeholder="如 OpenAI Blog"
                      value={source.name}
                      onChange={(event) => updateSource(index, { name: event.target.value })}
                    />
                  </div>
                  <div className="field">
                    <label>RSS 地址</label>
                    <input
                      type="text"
                      placeholder="https://example.com/rss.xml"
                      value={source.url}
                      onChange={(event) => updateSource(index, { url: event.target.value })}
                    />
                  </div>
                  <div className="field-row">
                    <div className="field">
                      <label>启用状态</label>
                      <select
                        value={source.active ? "启用" : "暂停"}
                        onChange={(event) => updateSource(index, { active: event.target.value === "启用" })}
                      >
                        <option>启用</option>
                        <option>暂停</option>
                      </select>
                    </div>
                    <div className="field">
                      <label>操作</label>
                      <button className="ghost" type="button" onClick={() => removeSource(index)}>移除</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="save-bar">
              <p className="helper">系统会在推送前拉取你的 RSS 列表。</p>
              <button className="primary" type="button" onClick={saveSources}>保存信息源</button>
            </div>
          </div>

          <div className="panel">
            <p className="panel-title">推送内容</p>
            <p className="panel-sub">选择需要推送的栏目与关键词。</p>
            <div className="toggle-grid">
              {defaultTopics.map((topic) => (
                <button
                  key={topic.key}
                  className={`toggle ${content.topics.includes(topic.key) ? "active" : ""}`}
                  type="button"
                  onClick={() => toggleTopic(topic.key)}
                >
                  {topic.label}
                </button>
              ))}
            </div>
            <div className="field">
              <label>关键词过滤</label>
              <input
                type="text"
                placeholder="如 LLM, Agent, RAG"
                value={content.keywords}
                onChange={(event) => setContent({ ...content, keywords: event.target.value })}
              />
            </div>
            <div className="field-row">
              <div className="field">
                <label>AI 资讯条数</label>
                <input
                  type="number"
                  min="5"
                  max="100"
                  value={content.aiLimit}
                  onChange={(event) => setContent({ ...content, aiLimit: event.target.value })}
                />
              </div>
              <div className="field">
                <label>GitHub 热度条数</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={content.trendingLimit}
                  onChange={(event) => setContent({ ...content, trendingLimit: event.target.value })}
                />
              </div>
              <div className="field">
                <label>论文条数</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={content.papersLimit}
                  onChange={(event) => setContent({ ...content, papersLimit: event.target.value })}
                />
              </div>
            </div>
            {content.topics.includes("skills") ? (
              <div className="field-row">
                <div className="field">
                  <label>Skills 榜单类型</label>
                  <select
                    value={content.skillsType}
                    onChange={(event) => setContent({ ...content, skillsType: event.target.value })}
                  >
                    <option value="trending">24H 热门</option>
                    <option value="hot">热度变化</option>
                    <option value="all_time">历史累计</option>
                  </select>
                </div>
                <div className="field">
                  <label>Skills 条数</label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={content.skillsLimit}
                    onChange={(event) => setContent({ ...content, skillsLimit: event.target.value })}
                  />
                </div>
              </div>
            ) : null}
            <div className="save-bar">
              <p className="helper">支持为不同渠道设置不同内容组合。</p>
              <button className="primary" type="button" onClick={saveSchedule}>保存全部设置</button>
            </div>
          </div>
        </section>
      </main>
      <footer className="footer">
        <p>绑定完成后，系统将在每日配置时间自动推送到你的私有通道。</p>
      </footer>
    </>
  );
}
