const axios = require("axios");
const db = require("../db");

const SKILLS_TYPES = new Set(["trending", "hot", "all_time"]);

function normalizeSkillsType(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return SKILLS_TYPES.has(normalized) ? normalized : "trending";
}

function getTodayDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function extractNextPayload(html) {
  const marker = "allTimeSkills";
  const prefix = "self.__next_f.push([1,\"";
  const markerIndex = html.indexOf(marker);
  if (markerIndex === -1) {
    throw new Error("skills.sh 数据结构未匹配");
  }
  const start = html.lastIndexOf(prefix, markerIndex);
  if (start === -1) {
    throw new Error("skills.sh 数据片段缺失");
  }
  let i = start + prefix.length;
  let escaped = false;
  let raw = "";
  for (; i < html.length; i += 1) {
    const ch = html[i];
    if (escaped) {
      raw += ch;
      escaped = false;
      continue;
    }
    if (ch === "\\") {
      raw += ch;
      escaped = true;
      continue;
    }
    if (ch === "\"") {
      break;
    }
    raw += ch;
  }
  if (!raw) {
    throw new Error("skills.sh 数据为空");
  }
  return JSON.parse(`"${raw}"`);
}

function extractJsonObject(text, startIndex) {
  let depth = 0;
  let inString = false;
  let escaped = false;
  let start = -1;
  for (let i = startIndex; i < text.length; i += 1) {
    const ch = text[i];
    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        escaped = true;
        continue;
      }
      if (ch === "\"") {
        inString = false;
      }
      continue;
    }
    if (ch === "\"") {
      inString = true;
      continue;
    }
    if (ch === "{") {
      if (depth === 0) {
        start = i;
      }
      depth += 1;
      continue;
    }
    if (ch === "}") {
      depth -= 1;
      if (depth === 0 && start !== -1) {
        return text.slice(start, i + 1);
      }
    }
  }
  return null;
}

function normalizeSkill(item, rank, listType) {
  const installsYesterday = item.installsYesterday ?? null;
  const changeValue = item.change ?? null;
  const parsedInstallsYesterday =
    installsYesterday === null || installsYesterday === undefined ? null : Number(installsYesterday);
  const parsedChange =
    changeValue === null || changeValue === undefined ? null : Number(changeValue);
  return {
    list_type: listType,
    rank,
    source: item.source || "",
    skill_id: item.skillId || item.skill_id || "",
    name: item.name || "",
    installs: Number(item.installs) || 0,
    installs_yesterday: Number.isNaN(parsedInstallsYesterday) ? null : parsedInstallsYesterday,
    change: Number.isNaN(parsedChange) ? null : parsedChange,
  };
}

async function fetchSkillsLeaderboard() {
  const url = "https://skills.sh/trending";
  const response = await axios.get(url, {
    headers: {
      "User-Agent": "AgentRadar/1.0",
      "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    },
  });

  const payload = extractNextPayload(response.data);
  const objIndex = payload.indexOf("{\"allTimeSkills\"");
  if (objIndex === -1) {
    throw new Error("skills.sh 榜单数据未找到");
  }
  const jsonStr = extractJsonObject(payload, objIndex);
  if (!jsonStr) {
    throw new Error("skills.sh 榜单解析失败");
  }
  const data = JSON.parse(jsonStr);
  const snapshotDate = getTodayDate();

  const listMapping = [
    { key: "allTimeSkills", type: "all_time" },
    { key: "trendingSkills", type: "trending" },
    { key: "trulyTrendingSkills", type: "hot" },
  ];

  const deleteStmt = db.prepare("DELETE FROM skills_items WHERE snapshot_date = ? AND list_type = ?");
  const insertStmt = db.prepare(`
    INSERT INTO skills_items
    (list_type, rank, source, skill_id, name, installs, installs_yesterday, change, snapshot_date)
    VALUES (@list_type, @rank, @source, @skill_id, @name, @installs, @installs_yesterday, @change, @snapshot_date)
  `);

  const result = {};
  const insertMany = db.transaction((rows, listType) => {
    deleteStmt.run(snapshotDate, listType);
    rows.forEach((row) => {
      insertStmt.run({ ...row, snapshot_date: snapshotDate });
    });
  });

  listMapping.forEach(({ key, type }) => {
    const list = Array.isArray(data[key]) ? data[key] : [];
    const normalized = list.map((item, index) => normalizeSkill(item, index + 1, type));
    insertMany(normalized, type);
    result[type] = normalized.length;
  });

  return result;
}

function getLatestSkills(listType = "trending", limit = 20) {
  const normalizedType = normalizeSkillsType(listType);
  const latest = db
    .prepare("SELECT MAX(snapshot_date) AS date FROM skills_items WHERE list_type = ?")
    .get(normalizedType);
  if (!latest || !latest.date) {
    return { list: [], snapshot: null, listType: normalizedType };
  }
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 200);
  const rows = db
    .prepare(
      "SELECT * FROM skills_items WHERE list_type = ? AND snapshot_date = ? ORDER BY rank ASC LIMIT ?"
    )
    .all(normalizedType, latest.date, safeLimit);
  return { list: rows, snapshot: latest.date, listType: normalizedType };
}

module.exports = {
  fetchSkillsLeaderboard,
  getLatestSkills,
  normalizeSkillsType,
};
