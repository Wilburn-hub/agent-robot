# 实现计划（AI 机器人周报）

## 目标描述
- 完成 AI 机器人周报的前后端可运行版本（React 前端 + Node 后端）。
- 支持邮箱/密码登录与 GitHub OAuth。
- 支持用户自配置企微机器人/公众号推送与定时任务。

## 涉及文件
- `server.js`
- `src/db.js`
- `src/utils/auth.js`
- `src/utils/time.js`
- `src/services/github.js`
- `src/services/ai.js`
- `src/services/digest.js`
- `src/services/push.js`
- `src/jobs/scheduler.js`
- `src/routes/auth.js`
- `src/routes/data.js`
- `src/routes/settings.js`
- `web/index.html`
- `web/vite.config.js`
- `web/src/App.jsx`
- `web/src/main.jsx`
- `web/src/styles.css`
- `web/src/lib/api.js`
- `web/src/components/Topbar.jsx`
- `web/src/pages/Home.jsx`
- `web/src/pages/Auth.jsx`
- `web/src/pages/Settings.jsx`

## 字段映射
| 前端字段 | 后端字段 | 说明 |
|----------|----------|------|
| email | users.email | 登录邮箱 |
| password | users.password_hash | bcrypt 哈希 |
| name | users.name | 昵称 |
| githubId | users.github_id | GitHub 用户 ID |
| webhook | push_channels.webhook | 企微 Webhook |
| appId | push_channels.app_id | 公众号 AppID |
| appSecret | push_channels.app_secret | 公众号 Secret |
| templateId | push_channels.template_id | 模板消息 ID |
| openids | push_channels.openids | 逗号分隔 |
| templateJson | push_channels.template_json | 公众号模板 data JSON |
| time | push_schedule.time | 推送时间 HH:mm |
| timezone | push_schedule.timezone | 时区 |
| frequency | push_schedule.frequency | daily/weekday/weekly |
| content | push_schedule.content_json | 推送内容配置 |

## API 路径
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `PUT /api/auth/me`
- `GET /api/auth/github`
- `GET /api/auth/github/callback`
- `GET /api/trending`
- `GET /api/weekly`
- `GET /api/ai`
- `POST /api/channels/wecom`
- `POST /api/channels/wechat`
- `POST /api/channels/:type/test`
- `GET /api/settings`
- `PUT /api/settings`
- `POST /api/admin/refresh`

## 本次变更（雷达真实数据）
- 页面：`web/src/pages/Home.jsx`
  - 生成雷达数据点（来自趋势仓库 + AI 资讯）
  - 为雷达点提供可点击链接与悬停提示
- 样式：`web/src/styles.css`
  - 新增雷达点样式、悬浮提示与脉冲动效

## 本次变更（推送通道用户教程）
- 页面：`web/src/pages/Settings.jsx`
  - 推送渠道面板新增「配置教程」入口
- 静态文档：`public/push-channels.html`
  - 面向用户的推送通道配置说明与外部参考链接
- 样式：`web/src/styles.css`
  - 增加推送渠道帮助区块样式

## 本次变更（品牌图标返回首页）
- 组件：`web/src/components/Topbar.jsx`
  - 将品牌图标设为返回首页的链接
- 样式：`web/src/styles.css`
  - 增加品牌图标链接的交互样式
