const axios = require("axios");
const { buildDigestText, buildDigestSummary } = require("./digest");

const wechatTokenCache = new Map();

async function sendWecomMessage(webhook, text) {
  if (!webhook) {
    throw new Error("Webhook 未配置");
  }
  const payload = {
    msgtype: "text",
    text: {
      content: text,
    },
  };
  const response = await axios.post(webhook, payload, {
    headers: { "Content-Type": "application/json" },
  });
  return response.data;
}

async function getWeChatToken(appId, appSecret) {
  if (!appId || !appSecret) {
    throw new Error("AppID 或 AppSecret 未配置");
  }
  const cacheKey = `${appId}`;
  const cached = wechatTokenCache.get(cacheKey);
  if (cached && cached.expireAt > Date.now()) {
    return cached.token;
  }

  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appId}&secret=${appSecret}`;
  const response = await axios.get(url);
  if (!response.data || !response.data.access_token) {
    throw new Error(`获取公众号 token 失败: ${JSON.stringify(response.data)}`);
  }
  const token = response.data.access_token;
  const expiresIn = (response.data.expires_in || 7200) * 1000;
  wechatTokenCache.set(cacheKey, { token, expireAt: Date.now() + expiresIn - 60000 });
  return token;
}

async function sendWeChatTemplateMessage(channel, contentConfig) {
  const { app_id: appId, app_secret: appSecret, template_id: templateId, openids, template_json } = channel;
  if (!templateId) {
    throw new Error("模板消息 ID 未配置");
  }
  const openidList = (openids || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  if (!openidList.length) {
    throw new Error("OpenID 未配置");
  }

  const token = await getWeChatToken(appId, appSecret);
  const url = `https://api.weixin.qq.com/cgi-bin/message/template/send?access_token=${token}`;
  const digest = buildDigestSummary(contentConfig);

  const aiTitles = (digest.aiItems.length ? digest.aiItems : digest.papers).map((item) => item.title).join(" / ");
  let templateData = {
    title: { value: "AI 机器人周报" },
    keyword1: { value: digest.trending.map((item) => item.name).join(" / ") || "本期无热度项目" },
    keyword2: { value: aiTitles || "本期无 AI 更新" },
    remark: { value: "点击查看完整周报" },
  };

  if (template_json) {
    try {
      templateData = JSON.parse(template_json);
    } catch (error) {
      console.warn("模板 JSON 解析失败，已使用默认模板字段");
    }
  }

  const results = [];
  for (const openid of openidList) {
    const payload = {
      touser: openid,
      template_id: templateId,
      data: templateData,
    };
    const response = await axios.post(url, payload);
    results.push(response.data);
  }
  return results;
}

async function sendDigestByChannel(channel, contentConfig = {}) {
  if (channel.type === "wecom") {
    const text = buildDigestText(contentConfig);
    return sendWecomMessage(channel.webhook, text);
  }
  if (channel.type === "wechat") {
    return sendWeChatTemplateMessage(channel, contentConfig);
  }
  throw new Error("未知推送通道");
}

module.exports = {
  sendWecomMessage,
  sendWeChatTemplateMessage,
  sendDigestByChannel,
};
