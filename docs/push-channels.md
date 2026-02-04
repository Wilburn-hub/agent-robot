# 推送通道配置指南

本文档用于指导「推送通道」配置页的字段填写，覆盖 **企业微信群机器人（Webhook）**、**飞书群机器人（Webhook）** 与 **微信公众号推送（模板消息/订阅通知）** 三种模式。

## 企微机器人（企业微信群机器人 Webhook）

### 前置条件
- 群机器人仅支持 **企业微信内部群**，包含外部联系人的群聊无法添加机器人。([Gitee 帮助中心](https://help.gitee.com/enterprise/code-manage/%E9%9B%86%E6%88%90%E4%B8%8E%E7%94%9F%E6%80%81/WebHook/WebHook%20%E5%AF%B9%E4%BC%81%E4%B8%9A%E5%BE%AE%E4%BF%A1%E7%9A%84%E6%94%AF%E6%8C%81))
- 如果群聊开启“仅群主管理”，普通成员可能没有添加入口。([企鲸帮助文档](https://qijing.net/help/faq/WeComgroup.html))

### 获取 Webhook
1. 在企业微信客户端进入目标群聊，打开群信息页。
2. 选择「群机器人」 → 「添加机器人」 → 「新建机器人」，设置名称/头像后点击添加。
3. 复制生成的 Webhook 地址（形如 `https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=...`）。([Gitee 帮助中心](https://help.gitee.com/enterprise/code-manage/%E9%9B%86%E6%88%90%E4%B8%8E%E7%94%9F%E6%80%81/WebHook/WebHook%20%E5%AF%B9%E4%BC%81%E4%B8%9A%E5%BE%AE%E4%BF%A1%E7%9A%84%E6%94%AF%E6%8C%81))

### 在系统中填写
- `WEBHOOK 地址`：粘贴复制的 URL。
- `备注名称`：例如「AI 机器人周报」。
- `启用状态`：选择「启用」。
- `测试推送`：验证机器人是否能在群内收到消息。

### 官方接口文档
- 企业微信群机器人接口文档（消息格式、参数等）：[developer.work.weixin.qq.com/document/path/91770](https://developer.work.weixin.qq.com/document/path/91770)（入口可能需在企业微信开发者中心登录后访问）。([CSDN 文章引用](https://blog.csdn.net/weixin_52236586/article/details/146296372))

## 飞书机器人（群聊自定义机器人 Webhook）

### 前置条件
- 仅飞书内部群支持自定义机器人，外部群聊需由管理员开通权限。
- 如果在机器人安全设置中启用了 **签名校验**，需要额外配置 **签名密钥**。

### 获取 Webhook
1. 在飞书客户端进入目标群聊，打开「群设置」→「机器人」→「添加机器人」。
2. 选择「自定义机器人」，设置名称与头像后生成 Webhook。
3. 复制 Webhook 地址（形如 `https://open.feishu.cn/open-apis/bot/v2/hook/xxxx`）。

### 在系统中填写
- `WEBHOOK 地址`：粘贴复制的 URL。
- `签名密钥（可选）`：若飞书机器人安全设置启用了签名校验，请填写密钥。
- `备注名称`：例如「AI 机器人周报」。
- `启用状态`：选择「启用」。
- `测试推送`：验证机器人是否能在群内收到消息。

### 官方参考
- 飞书自定义机器人消息格式与签名说明：[www.feishu.cn/content/7271149634339422210](https://www.feishu.cn/content/7271149634339422210)

## 飞书晚间推送配置（示例）

> 适合希望在晚间固定时间收到日报/周报的场景。

1. 在「设置中心」进入 **推送时间**。
2. 将 `时区` 设为 `Asia/Shanghai`（或你的实际时区）。
3. 将 `每天推送时间` 设为 `20:30`（或你希望的晚间时间）。
4. 选择 `频率`（每日 / 工作日 / 每周一），点击「保存全部设置」。
5. 回到「推送渠道」确认飞书通道为 **启用** 状态。

## 公众号推送（模板消息）

### 开通与模板申请
1. 进入公众号后台，在「广告与服务 → 模板消息」中添加模板并获取 **模板 ID**。
2. 若模板库无合适模板，需要按规范提交申请。([模板消息规范](https://developers.weixin.qq.com/doc/offiaccount/Message_Management/Template_Message_Operation_Specifications.html))

### 接口文档
- 模板消息接口文档：[developers.weixin.qq.com/doc/offiaccount/Message_Management/Template_Message_Interface.html](https://developers.weixin.qq.com/doc/offiaccount/Message_Management/Template_Message_Interface.html)（接口与参数说明）。([腾讯云开发者社区文章](https://cloud.tencent.com/developer/article/2225358))

### 业务合规提示
- 模板消息仅用于重要服务通知，不支持营销类消息。([腾讯云开发者社区文章](https://cloud.tencent.com/developer/article/2354962))

## 公众号推送（订阅通知，可选）

如果你的公众号后台显示的是「订阅通知」而非「模板消息」，请参考以下文档：

- 订阅通知能力介绍：[developers.weixin.qq.com/doc/offiaccount/Subscription_Messages/intro.html](https://developers.weixin.qq.com/doc/offiaccount/Subscription_Messages/intro.html)（开通与能力范围）。([CSDN 文章引用](https://gitcode.csdn.net/65ec4de91a836825ed797827.html))
- H5 订阅通知开放标签说明：[developers.weixin.qq.com/doc/offiaccount/OA_Web_Apps/Wechat_Open_Tag.html#23](https://developers.weixin.qq.com/doc/offiaccount/OA_Web_Apps/Wechat_Open_Tag.html#23)。([CSDN 文章引用](https://blog.csdn.net/m0_37592532/article/details/116066277))

## 字段映射速查

- **企微机器人**：`WEBHOOK 地址`、`备注名称`、`启用状态`
- **飞书机器人**：`WEBHOOK 地址`、`签名密钥（可选）`、`备注名称`、`启用状态`
- **公众号模板消息**：`AppID`、`AppSecret`、`模板 ID`、`OpenID 列表`（可选 `模板 data JSON`）

如需把以上流程嵌入到产品内的“帮助提示/引导文案”，告诉我你希望的展示位置和文案长度，我可以直接补齐。
