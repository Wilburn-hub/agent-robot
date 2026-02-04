# 实现计划（AI 机器人周报）

## 目标描述
- 实现 AI 机器人周报的自动化部署流程（GitHub Actions + 阿里云 VPS + PM2）。
- 参考 **GYM** 项目的成熟经验进行流水线优化（包含步骤标识、Emoji、健康检查等）。
- 修复生产环境管理员权限无法识别的问题，支持通过配置邮箱自动提升管理员。
- 完善飞书群机器人（Webhook）推送通道，支持签名安全密钥、测试推送与前端配置。
- 完善数据刷新与定时任务：新增数据刷新任务、清理任务、执行状态记录与防重策略。

## 用户审核项

> [!IMPORTANT]
> **默认部署方案建议：**
> 由于尚未获得具体服务器地址，我将为您配置一套通用的 **SSH 自动部署** 流水线。
> 它会：构建前端 -> 将产物同步到服务器 -> 重启后端服务。
> 
> 您需要在 GitHub Repo 的 `Settings > Secrets and variables > Actions` 中配置以下常量：
> - `DEPLOY_HOST`: 服务器 IP
> - `DEPLOY_USER`: 登录用户名（如 root）
> - `DEPLOY_KEY`: SSH 私钥
> - `DEPLOY_PATH`: 项目在服务器上的绝对路径（如 /var/www/agent-robot）

## 涉及文件
- `server.js`
- `src/db.js`
- `src/utils/auth.js`
- `src/utils/time.js`
- `src/services/github.js`
- `src/services/ai.js`
- `src/services/digest.js`
- `src/services/push.js`
- `src/services/refresh.js`
- `src/jobs/scheduler.js`
- `src/routes/auth.js`
- `src/routes/data.js`
- `src/routes/settings.js`
- `src/routes/admin.js`
- `docs/push-channels.md`
- `docs/api.md`
- `docs/integration-checklist.md`
- `.env`
- `.env.example`
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
- `public/push-channels.html`

## 字段映射
| 前端字段 | 后端字段 | 说明 |
|----------|----------|------|
| email | users.email | 登录邮箱 |
| password | users.password_hash | bcrypt 哈希 |
| name | users.name | 昵称 |
| githubId | users.github_id | GitHub 用户 ID |
| webhook | push_channels.webhook | 企微 Webhook |
| feishuSecret | push_channels.secret | 飞书机器人签名密钥（可选） |
| appId | push_channels.app_id | 公众号 AppID |
| appSecret | push_channels.app_secret | 公众号 Secret |
| templateId | push_channels.template_id | 模板消息 ID |
| openids | push_channels.openids | 逗号分隔 |
| templateJson | push_channels.template_json | 公众号模板 data JSON |
| time | push_schedule.time | 推送时间 HH:mm |
| timezone | push_schedule.timezone | 时区 |
| frequency | push_schedule.frequency | daily/weekday/weekly |
| content | push_schedule.content_json | 推送内容配置 |
| sentKey | push_logs.sent_key | 定时推送防重复标识 |

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
- `POST /api/channels/feishu`
- `POST /api/channels/:type/test`
- `GET /api/settings`
- `PUT /api/settings`
- `POST /api/admin/refresh`

### [GitHub Actions]

#### [NEW] [.github/workflows/deploy.yml](file:///.github/workflows/deploy.yml)
- **触发条件**：代码推送到 `main` 分支。
- **工作流内容**：
  1. **Build**: 在 GitHub Runner 中安装依赖并构建前端。
  2. **Deploy**: 使用 `appleboy/scp-action` 将代码同步到服务器。
  3. **Restart**: 使用 `appleboy/ssh-action` 执行 `npm install` 并用 `pm2 restart` 刷新应用。

#### [NEW] [生态文件]
- **ecosystem.config.js**: 配置 PM2 启动参数（集群模式、应用名称、环境变量接口）。

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

## 本次变更（管理员权限修复）
- 后端：`src/utils/auth.js`
  - 解析 `ADMIN_EMAIL` / `ADMIN_EMAILS` 配置并支持按邮箱自动同步管理员角色
- 后端：`src/routes/auth.js`
  - 注册/登录/GitHub 登录后自动同步管理员角色
- 后端：`src/db.js`
  - 启动时同步管理员邮箱列表，避免线上重启前角色丢失
- 配置：`.env` / `.env.example`
  - 增加管理员邮箱配置项说明

## 本次变更（飞书机器人对接）
- 后端：`src/db.js`
  - 为 `push_channels` 增加 `secret` 字段迁移
- 后端：`src/services/push.js`
  - 新增飞书 Webhook 推送与签名逻辑
- 后端：`src/routes/settings.js`
  - 新增飞书通道保存接口
- 前端：`web/src/pages/Settings.jsx`
  - 新增飞书通道表单、测试推送入口与路由参数支持
- 文档：`docs/push-channels.md` / `public/push-channels.html`
  - 补充飞书机器人配置说明与字段速查
- 文档：`docs/api.md` / `docs/integration-checklist.md`
  - 更新 API 清单与字段映射
