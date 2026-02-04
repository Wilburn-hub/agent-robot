# API 文档（AI 机器人周报）

## 📊 页面数据需求

| 页面/组件 | 数据类型 | 操作 | 字段列表 | 备注 |
|-----------|----------|------|----------|------|
| 首页趋势榜 | 列表 | 查询 | owner, name, description, language, stars, stars_delta | 周榜 + 热度 | 
| AI 雷达流 | 列表 | 查询 | title, source, published_at, url | RSS 聚合 |
| 登录/注册 | 表单 | 新增/登录 | email, password, name | JWT 登录 |
| 设置中心 | 详情 | 查询/更新 | time, timezone, frequency, content, channels | 用户级配置 |
| 推送通道 | 表单 | 新增/更新 | webhook/secret/appId/appSecret/templateId/openids | 企微/飞书/公众号 |

## 🔌 API 需求清单

| 功能 | 方法 | 路径建议 | 请求参数 | 响应字段 |
|------|------|----------|----------|----------|
| 注册 | POST | /api/auth/register | name, email, password | token, user |
| 登录 | POST | /api/auth/login | email, password | token, user |
| 用户信息 | GET | /api/auth/me | - | id, email, name, githubId |
| 更新用户 | PUT | /api/auth/me | name, email | id, email, name, githubId |
| GitHub OAuth | GET | /api/auth/github | - | 重定向 |
| GitHub 回调 | GET | /api/auth/github/callback | code, state | 重定向携带 token |
| 获取周榜 | GET | /api/trending | language, q, period, limit | list |
| 获取周榜（别名） | GET | /api/weekly | language, q, limit | list |
| AI 资讯流 | GET | /api/ai | category, q, limit | list |
| 简报预览 | GET | /api/digest/preview | topics, keywords | text |
| 简报测试推送 | POST | /api/digest/send | - | text, results |
| 保存企微通道 | POST | /api/channels/wecom | name, webhook, active | - |
| 保存飞书通道 | POST | /api/channels/feishu | name, webhook, secret, active | - |
| 保存公众号通道 | POST | /api/channels/wechat | appId, appSecret, templateId, openids, templateJson | - |
| 测试推送 | POST | /api/channels/:type/test | - | 发送结果 |
| 获取设置 | GET | /api/settings | - | schedule, channels |
| 保存设置 | PUT | /api/settings | time, timezone, frequency, content | - |
| 强制刷新 | POST | /api/admin/refresh | - | - |

## 通用响应格式

```json
{
  "code": 200,
  "msg": "success",
  "data": {}
}
```

## 接口详情

### 注册
**请求信息**
- **路径**: `POST /api/auth/register`
- **权限**: 无
- **描述**: 邮箱注册并返回 token

**请求参数**
| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| name | string | ❌ | 昵称 | "小川" |
| email | string | ✅ | 邮箱 | "a@b.com" |
| password | string | ✅ | 密码 | "12345678" |

**响应数据**
| 字段名 | 类型 | 说明 | 示例 |
|--------|------|------|------|
| token | string | JWT | "xxxxx" |
| user | object | 用户信息 | - |

### 登录
**请求信息**
- **路径**: `POST /api/auth/login`
- **权限**: 无
- **描述**: 邮箱登录并返回 token

**请求参数**
| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| email | string | ✅ | 邮箱 | "a@b.com" |
| password | string | ✅ | 密码 | "12345678" |

### 更新用户
**请求信息**
- **路径**: `PUT /api/auth/me`
- **权限**: 需登录
- **描述**: 更新昵称与邮箱

**请求参数**
| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| name | string | ❌ | 昵称 | "小川" |
| email | string | ✅ | 邮箱 | "a@b.com" |

### 获取趋势榜
**请求信息**
- **路径**: `GET /api/trending`
- **权限**: 无
- **描述**: 获取最新周榜数据

**请求参数**
| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| language | string | ❌ | 语言过滤 | "Python" |
| q | string | ❌ | 关键词搜索 | "agent" |
| period | string | ❌ | weekly/lastweek/monthly | "weekly" |
| limit | number | ❌ | 返回条数 | 20 |

**响应数据**
| 字段名 | 类型 | 说明 | 示例 |
|--------|------|------|------|
| owner | string | 仓库所有者 | "openai" |
| name | string | 仓库名 | "openai-cookbook" |
| stars | number | 星标数 | 12000 |
| stars_delta | number | 周度新增 | 980 |

### 获取 AI 资讯流
**请求信息**
- **路径**: `GET /api/ai`
- **权限**: 无
- **描述**: 获取最新 AI RSS 聚合

**请求参数**
| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| category | string | ❌ | all/research/product/opensource | "research" |
| q | string | ❌ | 关键词搜索 | "LLM" |
| limit | number | ❌ | 返回条数 | 20 |

### 简报预览
**请求信息**
- **路径**: `GET /api/digest/preview`
- **权限**: 无
- **描述**: 生成简报文本预览

**请求参数**
| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| topics | string | ❌ | 逗号分隔 topics | "weekly,ai" |
| keywords | string | ❌ | 关键词 | "LLM,Agent" |

**响应数据**
| 字段名 | 类型 | 说明 | 示例 |
|--------|------|------|------|
| text | string | 简报内容 | "【AI 机器人周报】..." |

### 简报测试推送
**请求信息**
- **路径**: `POST /api/digest/send`
- **权限**: 需登录
- **描述**: 按用户配置通道发送一次测试推送

**响应数据**
| 字段名 | 类型 | 说明 | 示例 |
|--------|------|------|------|
| text | string | 简报内容 | "【AI 机器人周报】..." |
| results | array | 推送结果 | [{channel:"wecom",status:"success"}] |

**响应数据**
| 字段名 | 类型 | 说明 | 示例 |
|--------|------|------|------|
| title | string | 标题 | "New model release" |
| source | string | 来源 | "OpenAI Blog" |
| published_at | string | 发布时间 | "2025-01-01" |

### 保存推送设置
**请求信息**
- **路径**: `PUT /api/settings`
- **权限**: 需登录
- **描述**: 更新推送时间与内容选择

**请求参数**
| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| time | string | ✅ | HH:mm | "08:30" |
| timezone | string | ✅ | 时区 | "Asia/Shanghai" |
| frequency | string | ✅ | daily/weekday/weekly | "daily" |
| content | object | ❌ | 推送内容 | {"topics": ["weekly","ai"], "keywords": "LLM"} |

### 保存企微通道
**请求信息**
- **路径**: `POST /api/channels/wecom`
- **权限**: 需登录
- **描述**: 绑定企微机器人 Webhook

**请求参数**
| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| name | string | ❌ | 备注名称 | "每日简报群" |
| webhook | string | ✅ | 机器人 Webhook | "https://qyapi.weixin.qq.com/..." |
| active | boolean | ❌ | 启用状态 | true |

### 保存公众号通道
**请求信息**
- **路径**: `POST /api/channels/wechat`
- **权限**: 需登录
- **描述**: 绑定公众号模板消息推送

**请求参数**
| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| appId | string | ✅ | AppID | "wx123" |
| appSecret | string | ✅ | Secret | "abcd" |
| templateId | string | ✅ | 模板 ID | "tmpl" |
| openids | string | ✅ | OpenID 列表 | "openid1,openid2" |

### 保存飞书通道
**请求信息**
- **路径**: `POST /api/channels/feishu`
- **权限**: 需登录
- **描述**: 绑定飞书群聊自定义机器人 Webhook

**请求参数**
| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| name | string | ❌ | 备注名称 | "飞书日报群" |
| webhook | string | ✅ | 机器人 Webhook | "https://open.feishu.cn/open-apis/bot/v2/hook/..." |
| secret | string | ❌ | 签名密钥（启用签名校验时必填） | "xxxx" |
| active | boolean | ❌ | 启用状态 | true |
| templateJson | string | ❌ | 模板 data JSON | "{...}" |

### 测试推送
**请求信息**
- **路径**: `POST /api/channels/:type/test`
- **权限**: 需登录
- **描述**: 发送测试简报

**路径参数**
| 参数 | 说明 |
|------|------|
| type | wecom / wechat |

## 错误码
| 错误码 | 说明 |
|--------|------|
| 400 | 参数错误 |
| 401 | 未登录 |
| 403 | 无权限 |
| 404 | 不存在 |
| 500 | 服务器错误 |
