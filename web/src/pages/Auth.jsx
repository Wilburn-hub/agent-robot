import { useEffect, useState } from "react";
import Topbar from "../components/Topbar";
import { API } from "../lib/api";

export default function Auth() {
  const [mode, setMode] = useState("login");
  const [oauthEnabled, setOauthEnabled] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [registerForm, setRegisterForm] = useState({ name: "", email: "", password: "", confirm: "" });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (token) {
      API.setToken(token);
      window.history.replaceState({}, document.title, "/auth");
      window.location.href = "/settings";
    }
  }, []);

  useEffect(() => {
    let alive = true;
    API.request("/api/auth/providers")
      .then((res) => {
        if (!alive) return;
        setOauthEnabled(Boolean(res.data?.githubEnabled));
      })
      .catch(() => {
        if (!alive) return;
        setOauthEnabled(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const handleLogin = async () => {
    if (!loginForm.email || !loginForm.password) {
      alert("请填写邮箱和密码");
      return;
    }
    try {
      const res = await API.request("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(loginForm),
      });
      API.setToken(res.data.token);
      window.location.href = "/settings";
    } catch (error) {
      alert(error.message);
    }
  };

  const handleRegister = async () => {
    if (!registerForm.email || !registerForm.password) {
      alert("请填写邮箱和密码");
      return;
    }
    if (registerForm.password !== registerForm.confirm) {
      alert("两次密码输入不一致");
      return;
    }
    try {
      const res = await API.request("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name: registerForm.name,
          email: registerForm.email,
          password: registerForm.password,
        }),
      });
      API.setToken(res.data.token);
      window.location.href = "/settings";
    } catch (error) {
      alert(error.message);
    }
  };

  const handleOAuth = () => {
    window.location.href = "/api/auth/github";
  };

  return (
    <>
      <Topbar variant="auth" />
      <main className="auth-page">
        <section className="auth-grid">
          <div className="auth-copy">
            <p className="eyebrow">安全接入</p>
            <h2>创建你的专属 AI 机器人周报</h2>
            <p>
              {oauthEnabled ? "通过邮箱密码或 GitHub OAuth 登录，开启个人化推送配置。" : "通过邮箱密码登录，开启个人化推送配置。"}
              绑定企微机器人或公众号后，每天早上自动收到热点简报。
            </p>
            {oauthEnabled && (
              <div className="hero-stats" style={{ marginTop: "28px" }}>
                <div>
                  <p className="stat-value">OAuth</p>
                  <p className="stat-label">GitHub 授权</p>
                </div>
                <div>
                  <p className="stat-value">JWT</p>
                  <p className="stat-label">会话安全</p>
                </div>
              </div>
            )}
          </div>

          <div className="auth-card">
            <div className="auth-tabs">
              <button
                className={`tab-btn ${mode === "login" ? "active" : ""}`}
                onClick={() => setMode("login")}
              >
                登录
              </button>
              <button
                className={`tab-btn ${mode === "register" ? "active" : ""}`}
                onClick={() => setMode("register")}
              >
                注册
              </button>
            </div>

            <form className={`auth-form ${mode === "login" ? "active" : ""}`}>
              <div className="field">
                <label>邮箱</label>
                <input
                  type="email"
                  placeholder="name@domain.com"
                  value={loginForm.email}
                  onChange={(event) => setLoginForm({ ...loginForm, email: event.target.value })}
                />
              </div>
              <div className="field">
                <label>密码</label>
                <input
                  type="password"
                  placeholder="输入密码"
                  value={loginForm.password}
                  onChange={(event) => setLoginForm({ ...loginForm, password: event.target.value })}
                />
              </div>
              <div className="form-actions">
                <button className="primary" type="button" onClick={handleLogin}>
                  登录
                </button>
                {oauthEnabled && (
                  <button className="ghost oauth" type="button" onClick={handleOAuth}>
                    GitHub 授权登录
                  </button>
                )}
              </div>
              {oauthEnabled && (
                <p className="helper">
                  点击 GitHub 授权将自动创建账号并绑定。
                </p>
              )}
            </form>

            <form className={`auth-form ${mode === "register" ? "active" : ""}`}>
              <div className="field">
                <label>昵称</label>
                <input
                  type="text"
                  placeholder="你的显示名称"
                  value={registerForm.name}
                  onChange={(event) => setRegisterForm({ ...registerForm, name: event.target.value })}
                />
              </div>
              <div className="field">
                <label>邮箱</label>
                <input
                  type="email"
                  placeholder="name@domain.com"
                  value={registerForm.email}
                  onChange={(event) => setRegisterForm({ ...registerForm, email: event.target.value })}
                />
              </div>
              <div className="field-row">
                <div className="field">
                  <label>密码</label>
                  <input
                    type="password"
                    placeholder="至少 8 位"
                    value={registerForm.password}
                    onChange={(event) => setRegisterForm({ ...registerForm, password: event.target.value })}
                  />
                </div>
                <div className="field">
                  <label>确认密码</label>
                  <input
                    type="password"
                    placeholder="再次输入"
                    value={registerForm.confirm}
                    onChange={(event) => setRegisterForm({ ...registerForm, confirm: event.target.value })}
                  />
                </div>
              </div>
              <div className="form-actions">
                <button className="primary" type="button" onClick={handleRegister}>
                  创建账号
                </button>
                {oauthEnabled && (
                  <button className="ghost oauth" type="button" onClick={handleOAuth}>
                    GitHub 授权注册
                  </button>
                )}
              </div>
              <p className="helper">注册即代表你同意《用户协议》和《隐私政策》。</p>
            </form>
          </div>
        </section>
      </main>
      <footer className="footer">
        <p>登录后可在设置中心绑定企微机器人或公众号推送。</p>
      </footer>
    </>
  );
}
