# AI 机器人周报

一个面向 AI 生态的「周榜 + 资讯 + 推送」聚合平台，聚焦 GitHub 周榜、AI 资讯与 Agent 生态信号，支持企业微信机器人与公众号模板消息推送。

项目地址：`https://github.com/Wilburn-hub/agent-robot`

## 功能亮点

- GitHub 周榜/趋势排行，支持语言、周期与关键词过滤
- AI 资讯聚合与分类筛选（研究 / 产品 / 开源）
- Skills 热度榜（24H 热门 / 热度变化 / 历史累计）
- AI 雷达可视化，融合仓库/资讯/Skills 信号
- 简报预览与一键测试推送
- 企业微信机器人 / 公众号模板消息推送通道
- 登录与用户级推送配置（时区、频率、内容偏好）
- 管理接口支持数据手动刷新

## 技术栈

- 后端：Node.js + Express 5
- 前端：React 19 + Vite
- 数据：SQLite（better-sqlite3）
- 任务调度：node-cron
- 抓取与聚合：GitHub Trending + RSS + skills.sh

## 本地启动

```bash
npm install
cp .env.example .env
npm run dev
```

访问：`http://localhost:5173`

开发模式下会同时启动后端（`3000`）与前端（`5173`），前端通过代理访问 `/api`。

## 生产构建

```bash
npm run build
npm run start
```

如需用 PM2 管理进程，可参考 `ecosystem.config.js`。

## 环境变量

| 变量 | 必填 | 默认 | 说明 |
| --- | --- | --- | --- |
| `PORT` | 否 | `3000` | 服务端口 |
| `JWT_SECRET` | 是 | - | JWT 加密密钥 |
| `SESSION_SECRET` | 是 | - | Session 密钥 |
| `GITHUB_CLIENT_ID` | 否 | - | GitHub OAuth Client ID |
| `GITHUB_CLIENT_SECRET` | 否 | - | GitHub OAuth Client Secret |
| `GITHUB_REDIRECT_URI` | 否 | `http://localhost:3000/api/auth/github/callback` | OAuth 回调地址 |
| `ADMIN_TOKEN` | 否 | - | 管理接口密钥 |
| `ADMIN_EMAIL` | 否 | - | 管理员邮箱（单个） |
| `ADMIN_EMAILS` | 否 | - | 管理员邮箱（逗号分隔） |
| `TRANSLATE_ENABLED` | 否 | `true` | 是否启用中文翻译 |
| `TRANSLATE_ENDPOINT` | 否 | `https://libretranslate.com/translate` | 翻译服务地址 |
| `TRANSLATE_API_KEY` | 否 | - | 翻译服务密钥 |
| `TRANSLATE_TIMEOUT` | 否 | `6000` | 翻译超时（毫秒） |
| `TRENDING_REFRESH_CRON` | 否 | `0 6 * * *` | GitHub Trending 刷新时间（Cron） |
| `AI_REFRESH_CRON` | 否 | `*/30 * * * *` | AI RSS 刷新时间（Cron） |
| `SKILLS_REFRESH_CRON` | 否 | `0 */6 * * *` | Skills 榜单刷新时间（Cron） |
| `CLEANUP_CRON` | 否 | `30 3 * * *` | 数据清理时间（Cron） |
| `AI_RETENTION_DAYS` | 否 | `30` | AI 资讯保留天数 |
| `TRENDING_RETENTION_DAYS` | 否 | `90` | Trending 快照保留天数 |
| `SKILLS_RETENTION_DAYS` | 否 | `30` | Skills 榜单快照保留天数 |
| `PUSH_LOG_RETENTION_DAYS` | 否 | `90` | 推送日志保留天数 |

## 数据刷新

管理员可通过接口手动刷新数据：

```bash
curl -X POST http://localhost:3000/api/admin/refresh \
  -H "x-admin-token: <ADMIN_TOKEN>"
```

系统还内置定时刷新与清理任务（含 Skills 榜单），可通过环境变量调整执行时间与保留周期。

## 推送通道配置

- 企微机器人与公众号模板消息配置说明：`docs/push-channels.md`
- API 清单与字段说明：`docs/api.md`
- 联调检查清单：`docs/integration-checklist.md`

## 项目结构

- `web/` React 前端
- `public/` Vite 构建产物
- `src/` 后端 API、服务、定时任务
- `data/` SQLite 数据库文件
- `docs/` 文档与联调说明

## 开源与贡献

- 开源协议：ISC License，详见 `LICENSE`
- 贡献指南：`CONTRIBUTING.md`
- 行为准则：`CODE_OF_CONDUCT.md`
- 安全说明：`SECURITY.md`
