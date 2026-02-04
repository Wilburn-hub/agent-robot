import { API } from "../lib/api";

export default function Topbar({ variant = "home", searchValue = "", onSearchChange, onSearchSubmit }) {
  const isAuthed = Boolean(API.getToken());
  const authLink = isAuthed ? "/settings" : "/auth";
  const authLabel = isAuthed ? "设置中心" : "登录";
  const githubUrl = "https://github.com/Wilburn-hub/agent-robot";
  const navItems = [
    { href: "/#weekly", label: "每周热度" },
    { href: "/#trending", label: "趋势排行" },
    { href: "/#ai", label: "AI 雷达" },
    { href: "/#push", label: "企微推送" },
    { href: "/settings", label: "设置中心" },
  ];

  const githubLink = (
    <a
      className="icon-link"
      href={githubUrl}
      target="_blank"
      rel="noreferrer"
      aria-label="访问 GitHub 仓库"
      title="GitHub 仓库"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2c-5.52 0-10 4.58-10 10.24 0 4.52 2.86 8.34 6.84 9.69.5.1.68-.22.68-.49 0-.24-.01-.88-.01-1.73-2.78.62-3.36-1.37-3.36-1.37-.45-1.18-1.1-1.49-1.1-1.49-.9-.64.07-.63.07-.63 1 .07 1.53 1.06 1.53 1.06.9 1.56 2.36 1.11 2.94.85.09-.67.35-1.11.64-1.37-2.22-.26-4.56-1.14-4.56-5.08 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.27 2.75 1.05a9.3 9.3 0 0 1 5 0c1.9-1.32 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.95-2.34 4.82-4.57 5.08.36.31.68.92.68 1.86 0 1.34-.01 2.43-.01 2.76 0 .27.18.6.69.49A10.1 10.1 0 0 0 22 12.24C22 6.58 17.52 2 12 2z" />
      </svg>
    </a>
  );

  let actionContent = null;
  if (variant === "home") {
    actionContent = (
      <>
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
      </>
    );
  }
  if (variant === "auth") {
    actionContent = (
      <a className="ghost" href="/">
        返回首页
      </a>
    );
  }
  if (variant === "settings") {
    actionContent = (
      <button
        className="ghost"
        type="button"
        onClick={() => {
          API.clearToken();
          window.location.href = "/auth";
        }}
      >
        退出登录
      </button>
    );
  }

  return (
    <header className="topbar">
      <div className="brand">
        <a className="brand-icon" href="/" aria-label="返回首页">
          <span className="brand-mark"></span>
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
      <div className="top-actions">
        {actionContent}
        {githubLink}
      </div>
    </header>
  );
}
