export const API = {
  getToken() {
    return localStorage.getItem("token");
  },
  setToken(token) {
    if (token) {
      localStorage.setItem("token", token);
    }
  },
  clearToken() {
    localStorage.removeItem("token");
  },
  async request(path, options = {}) {
    const headers = options.headers || {};
    const token = API.getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    const response = await fetch(path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.msg || "请求失败");
    }
    return data;
  },
};
