import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Topbar from "../components/Topbar";
import { API } from "../lib/api";

export default function Admin() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ userCount: 0, channelCount: 0, logCount: 0, successRate: 0 });
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [activeTab, setActiveTab] = useState("users");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [statsRes, usersRes, logsRes] = await Promise.all([
          API.request("/api/admin/stats"),
          API.request("/api/admin/users"),
          API.request("/api/admin/logs"),
        ]);
        setStats(statsRes.data);
        setUsers(usersRes.data.users);
        setLogs(logsRes.data.logs);
      } catch (err) {
        if (err.message.includes("401") || err.message.includes("未登录")) {
          navigate("/auth");
          return;
        }
        if (err.message.includes("403") || err.message.includes("无权限")) {
          setError("无管理员权限");
        } else {
          setError(err.message);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [navigate]);

  const deleteUser = async (id) => {
    if (!window.confirm("确定要删除该用户吗？")) return;
    try {
      await API.request(`/api/admin/users/${id}`, { method: "DELETE" });
      setUsers((prev) => prev.filter((u) => u.id !== id));
      setStats((prev) => ({ ...prev, userCount: prev.userCount - 1 }));
    } catch (err) {
      alert(err.message);
    }
  };

  const toggleRole = async (user) => {
    const newRole = user.role === "admin" ? "user" : "admin";
    try {
      await API.request(`/api/admin/users/${user.id}`, {
        method: "PUT",
        body: JSON.stringify({ role: newRole }),
      });
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, role: newRole } : u))
      );
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <>
        <Topbar variant="admin" />
        <main className="admin-page">
          <div className="loading">加载中...</div>
        </main>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Topbar variant="admin" />
        <main className="admin-page">
          <div className="error-message">{error}</div>
        </main>
      </>
    );
  }

  return (
    <>
      <Topbar variant="admin" />
      <main className="admin-page">
        <section className="admin-hero">
          <div>
            <p className="section-title">后台管理</p>
            <p className="section-sub">管理用户、查看推送记录与系统统计。</p>
          </div>
        </section>

        <section className="stats-grid">
          <div className="stat-card">
            <p className="stat-value">{stats.userCount}</p>
            <p className="stat-label">总用户数</p>
          </div>
          <div className="stat-card">
            <p className="stat-value">{stats.channelCount}</p>
            <p className="stat-label">活跃通道</p>
          </div>
          <div className="stat-card">
            <p className="stat-value">{stats.logCount}</p>
            <p className="stat-label">推送记录</p>
          </div>
          <div className="stat-card">
            <p className="stat-value">{stats.successRate}%</p>
            <p className="stat-label">成功率</p>
          </div>
        </section>

        <section className="admin-tabs">
          <div className="tab-switch">
            <button
              className={activeTab === "users" ? "active" : ""}
              onClick={() => setActiveTab("users")}
            >
              用户管理
            </button>
            <button
              className={activeTab === "logs" ? "active" : ""}
              onClick={() => setActiveTab("logs")}
            >
              推送日志
            </button>
          </div>

          {activeTab === "users" && (
            <div className="panel">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>邮箱</th>
                    <th>昵称</th>
                    <th>角色</th>
                    <th>注册时间</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td>{user.id}</td>
                      <td>{user.email || "-"}</td>
                      <td>{user.name || "-"}</td>
                      <td>
                        <span className={`role-badge ${user.role}`}>
                          {user.role === "admin" ? "管理员" : "用户"}
                        </span>
                      </td>
                      <td>{user.created_at?.slice(0, 10) || "-"}</td>
                      <td>
                        <button className="ghost small" onClick={() => toggleRole(user)}>
                          {user.role === "admin" ? "降级" : "升级"}
                        </button>
                        <button className="ghost small danger" onClick={() => deleteUser(user.id)}>
                          删除
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === "logs" && (
            <div className="panel">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>用户</th>
                    <th>通道</th>
                    <th>状态</th>
                    <th>时间</th>
                    <th>详情</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td>{log.id}</td>
                      <td>{log.user_email || log.user_name || log.user_id}</td>
                      <td>{log.channel_name || log.channel_type || "-"}</td>
                      <td>
                        <span className={`status-badge ${log.status}`}>
                          {log.status === "success" ? "成功" : log.status === "failed" ? "失败" : log.status}
                        </span>
                      </td>
                      <td>{log.sent_at?.slice(0, 16).replace("T", " ") || "-"}</td>
                      <td className="detail-cell">{log.detail || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
      <footer className="footer">
        <p>后台管理仅限管理员访问。</p>
      </footer>
    </>
  );
}
