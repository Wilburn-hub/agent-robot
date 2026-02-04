const db = require("../db");
const { fetchGitHubTrending } = require("./github");
const { fetchAiFeedsForAllUsers } = require("./ai");
const { fetchSkillsLeaderboard } = require("./skills");

const runningJobs = new Set();

function normalizeCount(result) {
  if (Array.isArray(result)) return result.length;
  if (typeof result === "number") return result;
  if (result && typeof result === "object") {
    return Object.values(result).reduce((sum, value) => sum + (Number(value) || 0), 0);
  }
  return 0;
}

function upsertJob(name, status, message = "", count = 0) {
  const now = new Date().toISOString();
  db.prepare(
    `
    INSERT INTO data_jobs (name, last_run_at, last_status, last_message, last_count)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(name) DO UPDATE SET
      last_run_at = excluded.last_run_at,
      last_status = excluded.last_status,
      last_message = excluded.last_message,
      last_count = excluded.last_count
  `
  ).run(name, now, status, message, count);
}

function getJob(name) {
  return db.prepare("SELECT * FROM data_jobs WHERE name = ?").get(name);
}

function isStale(lastRunAt, minMinutes) {
  if (!lastRunAt) return true;
  const last = Date.parse(lastRunAt);
  if (!Number.isFinite(last)) return true;
  return Date.now() - last >= minMinutes * 60 * 1000;
}

async function runJob(name, handler, options = {}) {
  if (runningJobs.has(name)) {
    return { skipped: true, reason: "running" };
  }
  runningJobs.add(name);
  try {
    const result = await handler();
    const count = normalizeCount(result);
    const message =
      typeof options.message === "function"
        ? options.message(result)
        : options.message || options.reason || "";
    upsertJob(name, "success", message, count);
    return { skipped: false, result, count };
  } catch (error) {
    upsertJob(name, "failed", error.message || "未知错误", 0);
    throw error;
  } finally {
    runningJobs.delete(name);
  }
}

async function refreshTrending(options = {}) {
  return runJob("github_trending", () => fetchGitHubTrending(), {
    reason: options.reason || "",
  });
}

async function refreshAiFeeds(options = {}) {
  return runJob("ai_feeds", () => fetchAiFeedsForAllUsers(), {
    reason: options.reason || "",
  });
}

async function refreshSkills(options = {}) {
  return runJob("skills_leaderboard", () => fetchSkillsLeaderboard(), {
    reason: options.reason || "",
  });
}

async function refreshTrendingIfStale(minMinutes = 360) {
  const job = getJob("github_trending");
  if (!job || isStale(job.last_run_at, minMinutes)) {
    return refreshTrending({ reason: "stale" });
  }
  return { skipped: true, reason: "fresh", last_run_at: job.last_run_at };
}

async function refreshAiFeedsIfStale(minMinutes = 60) {
  const job = getJob("ai_feeds");
  if (!job || isStale(job.last_run_at, minMinutes)) {
    return refreshAiFeeds({ reason: "stale" });
  }
  return { skipped: true, reason: "fresh", last_run_at: job.last_run_at };
}

async function refreshSkillsIfStale(minMinutes = 360) {
  const job = getJob("skills_leaderboard");
  if (!job || isStale(job.last_run_at, minMinutes)) {
    return refreshSkills({ reason: "stale" });
  }
  return { skipped: true, reason: "fresh", last_run_at: job.last_run_at };
}

async function cleanupOldData(options = {}) {
  const aiDays = Math.max(7, parseInt(process.env.AI_RETENTION_DAYS || "30", 10));
  const trendingDays = Math.max(14, parseInt(process.env.TRENDING_RETENTION_DAYS || "90", 10));
  const logDays = Math.max(7, parseInt(process.env.PUSH_LOG_RETENTION_DAYS || "90", 10));
  const skillsDays = Math.max(7, parseInt(process.env.SKILLS_RETENTION_DAYS || "30", 10));

  return runJob(
    "cleanup",
    () => {
      const aiCount = db
        .prepare("DELETE FROM ai_items WHERE datetime(created_at) < datetime('now', ?)")
        .run(`-${aiDays} days`).changes;
      const trendingCount = db
        .prepare("DELETE FROM trending_repos WHERE date(snapshot_date) < date('now', ?)")
        .run(`-${trendingDays} days`).changes;
      const skillsCount = db
        .prepare("DELETE FROM skills_items WHERE date(snapshot_date) < date('now', ?)")
        .run(`-${skillsDays} days`).changes;
      const logCount = db
        .prepare("DELETE FROM push_logs WHERE datetime(sent_at) < datetime('now', ?)")
        .run(`-${logDays} days`).changes;
      return { aiCount, trendingCount, skillsCount, logCount };
    },
    {
      message: (result) =>
        `ai:${result.aiCount}, trending:${result.trendingCount}, skills:${result.skillsCount}, logs:${result.logCount}`,
    }
  );
}

async function refreshAll(options = {}) {
  const reason = options.reason || "";
  const trending = await refreshTrending({ reason });
  const ai = await refreshAiFeeds({ reason });
  const skills = await refreshSkills({ reason });
  return { trending, ai, skills };
}

module.exports = {
  refreshTrending,
  refreshAiFeeds,
  refreshSkills,
  refreshTrendingIfStale,
  refreshAiFeedsIfStale,
  refreshSkillsIfStale,
  cleanupOldData,
  refreshAll,
  getJob,
};
