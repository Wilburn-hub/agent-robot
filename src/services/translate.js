const axios = require("axios");
const crypto = require("crypto");
const db = require("../db");

const enabled = (process.env.TRANSLATE_ENABLED || "true") === "true";
const endpoint = process.env.TRANSLATE_ENDPOINT || "https://libretranslate.com/translate";
const apiKey = process.env.TRANSLATE_API_KEY || "";
const timeout = parseInt(process.env.TRANSLATE_TIMEOUT || "6000", 10);

function hasChinese(text) {
  return /[\u4e00-\u9fa5]/.test(text || "");
}

function hashText(text) {
  return crypto.createHash("sha1").update(text).digest("hex");
}

async function translateToZh(text) {
  const clean = (text || "").trim();
  if (!enabled || !clean || hasChinese(clean)) {
    return clean;
  }
  const hash = hashText(clean);
  const cached = db.prepare("SELECT target_text FROM translations WHERE hash = ?").get(hash);
  if (cached && cached.target_text) {
    return cached.target_text;
  }
  try {
    const payload = {
      q: clean,
      source: "auto",
      target: "zh",
      format: "text",
    };
    if (apiKey) {
      payload.api_key = apiKey;
    }
    const response = await axios.post(endpoint, payload, { timeout });
    const translated = response.data?.translatedText || clean;
    db.prepare("INSERT OR IGNORE INTO translations (hash, source_text, target_text) VALUES (?, ?, ?)")
      .run(hash, clean.slice(0, 1000), translated);
    return translated;
  } catch (error) {
    return clean;
  }
}

module.exports = {
  translateToZh,
  hasChinese,
};
