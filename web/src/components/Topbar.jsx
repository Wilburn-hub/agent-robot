import { API } from "../lib/api";

export default function Topbar({ variant = "home", searchValue = "", onSearchChange, onSearchSubmit }) {
  const isAuthed = Boolean(API.getToken());
  const authLink = isAuthed ? "/settings" : "/auth";
  const authLabel = isAuthed ? "设置中心" : "登录";
  const navItems = [
    { href: "/#weekly", label: "每周热度" },
    { href: "/#trending", label: "趋势排行" },
    { href: "/#ai", label: "AI 雷达" },
    { href: "/#push", label: "企微推送" },
    { href: "/settings", label: "设置中心" },
  ];

  return (
    <header className="topbar">
      <div className="brand">
        <a className="brand-icon" href="/" aria-label="返回首页">
          <svg className="brand-mark" viewBox="0 0 48 48" aria-hidden="true">
            <defs>
              <linearGradient id="bolt-gradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#7B5CFF" />
                <stop offset="55%" stopColor="#6BE1FF" />
                <stop offset="100%" stopColor="#F6D365" />
              </linearGradient>
              <linearGradient id="spark-gradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#FF66C4" />
                <stop offset="100%" stopColor="#7B5CFF" />
              </linearGradient>
            </defs>
            <path
              d="M27.6 4L8.6 28.8H21l-2.2 15.2L39.4 20H27l2.6-16z"
              fill="url(#bolt-gradient)"
            />
            <circle cx="13" cy="12" r="4.2" fill="url(#spark-gradient)" />
          </svg>
        </a>
        <div>
          <p className="brand-title">AI 机器人周报</p>
          <p className="brand-sub">AI 热点 + Agent 机器人信号</p>
        </div>
      </div>
      <nav className="nav">
        {navItems.map((item) => (
          <a key={item.href} href={item.href}>
            {item.label}
          </a>
        ))}
      </nav>
      {variant === "home" && (
        <div className="top-actions">
          <div className="search">
            <span className="dot"></span>
            <input
              type="text"
              placeholder="搜索仓库 / 话题"
              value={searchValue}
              onChange={(event) => onSearchChange?.(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  onSearchSubmit?.();
                }
              }}
            />
          </div>
          <a className="ghost" href={authLink}>
            {authLabel}
          </a>
        </div>
      )}
      {variant === "auth" && (
        <div className="top-actions">
          <a className="ghost" href="/">
            返回首页
          </a>
        </div>
      )}
      {variant === "settings" && (
        <div className="top-actions">
          <button className="ghost" type="button" onClick={() => {
            API.clearToken();
            window.location.href = "/auth";
          }}>
            退出登录
          </button>
        </div>
      )}
    </header>
  );
}
