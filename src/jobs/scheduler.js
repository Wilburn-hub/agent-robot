const cron = require("node-cron");
const db = require("../db");
const { getTimeParts, isWeekday } = require("../utils/time");
const { sendDigestByChannel } = require("../services/push");

let running = false;

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
      const schedules = db.prepare("SELECT * FROM push_schedule").all();
      for (const schedule of schedules) {
        const parts = getTimeParts(schedule.timezone || "Asia/Shanghai");
        if (!shouldSend(schedule, parts)) {
          continue;
        }
        const userChannels = db
          .prepare("SELECT * FROM push_channels WHERE user_id = ? AND active = 1")
          .all(schedule.user_id);
        for (const channel of userChannels) {
          const existing = db
            .prepare(
              "SELECT * FROM push_logs WHERE user_id = ? AND channel_id = ? AND date(sent_at) = date('now')"
            )
            .get(schedule.user_id, channel.id);
          if (existing) {
            continue;
          }
          try {
            await sendDigestByChannel(channel);
            db.prepare("INSERT INTO push_logs (user_id, channel_id, status) VALUES (?, ?, ?)").run(
              schedule.user_id,
              channel.id,
              "success"
            );
          } catch (error) {
            db.prepare("INSERT INTO push_logs (user_id, channel_id, status, detail) VALUES (?, ?, ?, ?)").run(
              schedule.user_id,
              channel.id,
              "failed",
              error.message
            );
          }
        }
      }
    } finally {
      running = false;
    }
  });
}

module.exports = {
  startScheduler,
};
