# ✅ 接口联调清单

## 基础检查
- [ ] 接口路径与文档一致
- [ ] 请求参数名称/类型正确
- [ ] 响应数据结构正确
- [ ] 分页参数正确传递

## 边界情况
- [ ] 空数据返回 `[]` 而非 `null`
- [ ] 数值类型正确（不是字符串）
- [ ] 时间格式统一（推荐 ISO 8601）
- [ ] 枚举值前后端一致

## 错误处理
- [ ] 401 跳转登录页
- [ ] 403 显示无权限提示
- [ ] 500 显示通用错误提示
- [ ] 网络超时处理

## 🔄 字段映射表

| 前端字段 | 后端字段 | 说明 |
|----------|----------|------|
| email | users.email | 登录邮箱 |
| password | users.password_hash | bcrypt 哈希 |
| githubId | users.github_id | GitHub 用户 ID |
| webhook | push_channels.webhook | 企微 Webhook |
| appId | push_channels.app_id | 公众号 AppID |
| appSecret | push_channels.app_secret | 公众号 Secret |
| templateId | push_channels.template_id | 模板消息 ID |
| openids | push_channels.openids | 逗号分隔 |
| templateJson | push_channels.template_json | 模板 data JSON |
| time | push_schedule.time | 推送时间 |
| timezone | push_schedule.timezone | 时区 |
| frequency | push_schedule.frequency | 频率 |
| content | push_schedule.content_json | 内容配置 JSON |
