const cron = require("node-cron");
const db = require("../db");
const { getTimeParts, isWeekday } = require("../utils/time");
const { sendDigestByChannel } = require("../services/push");
const {
  refreshTrending,
  refreshAiFeeds,
  refreshTrendingIfStale,
  refreshAiFeedsIfStale,
  cleanupOldData,
} = require("../services/refresh");

let running = false;
let runningCleanup = false;

const TRENDING_REFRESH_CRON = process.env.TRENDING_REFRESH_CRON || "0 6 * * *";
const AI_REFRESH_CRON = process.env.AI_REFRESH_CRON || "*/30 * * * *";
const CLEANUP_CRON = process.env.CLEANUP_CRON || "30 3 * * *";

function shouldSend(schedule, timeParts) {
  if (`${timeParts.hour}:${timeParts.minute}` !== schedule.time) {
    return false;
  }
  if (schedule.frequency === "weekday" && !isWeekday(timeParts.weekday)) {
    return false;
  }
  if (schedule.frequency === "weekly" && timeParts.weekday !== "Mon") {
    return false;
  }
  return true;
}

function startScheduler() {
  cron.schedule("* * * * *", async () => {
    if (running) return;
    running = true;
    try {
      try {
        await refreshTrendingIfStale(360);
        await refreshAiFeedsIfStale(60);
      } catch (error) {
        console.warn("数据刷新失败:", error.message);
      }

      const schedules = db.prepare("SELECT * FROM push_schedule").all();
      for (const schedule of schedules) {
        const parts = getTimeParts(schedule.timezone || "Asia/Shanghai");
        if (!shouldSend(schedule, parts)) {
          continue;
        }
        const userChannels = db
          .prepare("SELECT * FROM push_channels WHERE user_id = ? AND active = 1")
          .all(schedule.user_id);
        let contentConfig = {};
        if (schedule.content_json) {
          try {
            contentConfig = JSON.parse(schedule.content_json);
          } catch (error) {
            contentConfig = {};
          }
        }
        const sentKey = `${schedule.timezone || "Asia/Shanghai"}|${parts.date}|${schedule.time}`;
        for (const channel of userChannels) {
          const existing = db
            .prepare(
              "SELECT * FROM push_logs WHERE user_id = ? AND channel_id = ? AND sent_key = ?"
            )
            .get(schedule.user_id, channel.id, sentKey);
          if (existing) {
            continue;
          }
          try {
            await sendDigestByChannel(channel, contentConfig, { userId: schedule.user_id });
            db.prepare("INSERT INTO push_logs (user_id, channel_id, status, sent_key) VALUES (?, ?, ?, ?)")
              .run(schedule.user_id, channel.id, "success", sentKey);
          } catch (error) {
            db.prepare("INSERT INTO push_logs (user_id, channel_id, status, detail, sent_key) VALUES (?, ?, ?, ?, ?)")
              .run(schedule.user_id, channel.id, "failed", error.message, sentKey);
          }
        }
      }
    } finally {
      running = false;
    }
  });

  cron.schedule(TRENDING_REFRESH_CRON, async () => {
    try {
      await refreshTrending({ reason: "cron" });
    } catch (error) {
      console.warn("GitHub Trending 刷新失败:", error.message);
    }
  });

  cron.schedule(AI_REFRESH_CRON, async () => {
    try {
      await refreshAiFeeds({ reason: "cron" });
    } catch (error) {
      console.warn("AI RSS 刷新失败:", error.message);
    }
  });

  cron.schedule(CLEANUP_CRON, async () => {
    if (runningCleanup) return;
    runningCleanup = true;
    try {
      await cleanupOldData();
    } catch (error) {
      console.warn("数据清理失败:", error.message);
    } finally {
      runningCleanup = false;
    }
  });
}

module.exports = {
  startScheduler,
};
