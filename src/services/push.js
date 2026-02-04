const axios = require("axios");
const crypto = require("crypto");
const { buildDigestText, buildDigestSummary } = require("./digest");

const wechatTokenCache = new Map();

// 按段落拆分内容，确保每段不超过 maxBytes 字节
function splitTextByBytes(text, maxBytes) {
  const paragraphs = text.split("\n");
  const chunks = [];
  let currentChunk = "";
  let currentBytes = 0;

  for (const paragraph of paragraphs) {
    const lineWithBreak = currentChunk ? "\n" + paragraph : paragraph;
    const lineBytes = Buffer.byteLength(lineWithBreak, "utf8");

    // 如果单行就超过限制，需要按字符拆分
    if (lineBytes > maxBytes) {
      // 先保存当前累积的内容
      if (currentChunk) {
        chunks.push(currentChunk);
        currentChunk = "";
        currentBytes = 0;
      }
      // 按字符拆分超长行
      let charChunk = "";
      let charBytes = 0;
      for (const char of paragraph) {
        const charByteLen = Buffer.byteLength(char, "utf8");
        if (charBytes + charByteLen > maxBytes) {
          chunks.push(charChunk);
          charChunk = char;
          charBytes = charByteLen;
        } else {
          charChunk += char;
          charBytes += charByteLen;
        }
      }
      if (charChunk) {
        currentChunk = charChunk;
        currentBytes = charBytes;
      }
    } else if (currentBytes + lineBytes > maxBytes) {
      // 当前段落加进去会超，先保存当前块
      chunks.push(currentChunk);
      currentChunk = paragraph;
      currentBytes = Buffer.byteLength(paragraph, "utf8");
    } else {
      // 正常累加
      currentChunk = currentChunk ? currentChunk + "\n" + paragraph : paragraph;
      currentBytes += lineBytes;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
}

async function sendWecomMessage(webhook, text) {
  if (!webhook) {
    throw new Error("Webhook 未配置");
  }

  // 企微限制 markdown.content 为 4096 字节，这里设置 3800 留安全余量
  const MAX_BYTES = 3800;
  const chunks = splitTextByBytes(text, MAX_BYTES);
  const results = [];

  for (let i = 0; i < chunks.length; i++) {
    // 如果有多条，添加分页标识
    let content = chunks[i];
    if (chunks.length > 1) {
      content = `**[${i + 1}/${chunks.length}]**\n\n${content}`;
    }

    const payload = {
      msgtype: "markdown",
      markdown: { content },
    };

    try {
      const response = await axios.post(webhook, payload, {
        headers: { "Content-Type": "application/json" },
      });
      if (response.data && typeof response.data.errcode !== "undefined" && response.data.errcode !== 0) {
        throw new Error(`企微返回错误: ${response.data.errcode} ${response.data.errmsg || ""}`.trim());
      }
      results.push(response.data);
    } catch (error) {
      const data = error.response?.data;
      if (data && typeof data.errcode !== "undefined") {
        throw new Error(`企微返回错误: ${data.errcode} ${data.errmsg || ""}`.trim());
      }
      throw error;
    }

    // 多条消息之间稍作延迟，避免触发频率限制
    if (i < chunks.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  return results.length === 1 ? results[0] : results;
}

function buildFeishuSign(secret, timestamp) {
  const stringToSign = `${timestamp}\n${secret}`;
  return crypto.createHmac("sha256", stringToSign).update("").digest("base64");
}

async function sendFeishuMessage(webhook, text, secret) {
  if (!webhook) {
    throw new Error("Webhook 未配置");
  }

  // 飞书文本消息长度有限，这里保守控制在 9000 字节以内
  const MAX_BYTES = 9000;
  const chunks = splitTextByBytes(text, MAX_BYTES);
  const results = [];

  for (let i = 0; i < chunks.length; i++) {
    let content = chunks[i];
    if (chunks.length > 1) {
      content = `[${i + 1}/${chunks.length}]\n${content}`;
    }

    const payload = {
      msg_type: "text",
      content: { text: content },
    };

    if (secret) {
      const timestamp = Math.floor(Date.now() / 1000);
      payload.timestamp = timestamp;
      payload.sign = buildFeishuSign(secret, timestamp);
    }

    try {
      const response = await axios.post(webhook, payload, {
        headers: { "Content-Type": "application/json" },
      });
      const data = response.data;
      if (data && typeof data.code !== "undefined" && data.code !== 0) {
        throw new Error(`飞书返回错误: ${data.code} ${data.msg || ""}`.trim());
      }
      if (data && typeof data.StatusCode !== "undefined" && data.StatusCode !== 0) {
        throw new Error(`飞书返回错误: ${data.StatusCode} ${data.StatusMessage || ""}`.trim());
      }
      results.push(data);
    } catch (error) {
      const data = error.response?.data;
      if (data && typeof data.code !== "undefined") {
        throw new Error(`飞书返回错误: ${data.code} ${data.msg || ""}`.trim());
      }
      if (data && typeof data.StatusCode !== "undefined") {
        throw new Error(`飞书返回错误: ${data.StatusCode} ${data.StatusMessage || ""}`.trim());
      }
      throw error;
    }

    if (i < chunks.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  return results.length === 1 ? results[0] : results;
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

async function sendWeChatTemplateMessage(channel, contentConfig, extra = {}) {
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
  const digest = buildDigestSummary({
    ...contentConfig,
    userId: extra.userId || channel.user_id,
  });

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

async function sendDigestByChannel(channel, contentConfig = {}, extra = {}) {
  if (channel.type === "wecom") {
    const text = await buildDigestText({
      ...contentConfig,
      userId: extra.userId || channel.user_id,
    });
    return sendWecomMessage(channel.webhook, text);
  }
  if (channel.type === "feishu") {
    const text = await buildDigestText({
      ...contentConfig,
      userId: extra.userId || channel.user_id,
    });
    return sendFeishuMessage(channel.webhook, text, channel.secret);
  }
  if (channel.type === "wechat") {
    return sendWeChatTemplateMessage(channel, contentConfig, extra);
  }
  throw new Error("未知推送通道");
}

module.exports = {
  sendWecomMessage,
  sendFeishuMessage,
  sendWeChatTemplateMessage,
  sendDigestByChannel,
};
