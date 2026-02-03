function getTimeParts(timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

  const map = {};
  parts.forEach((part) => {
    map[part.type] = part.value;
  });

  return {
    hour: map.hour,
    minute: map.minute,
    date: `${map.year}-${map.month}-${map.day}`,
    weekday: new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(new Date()),
  };
}

function isWeekday(weekday) {
  return ["Mon", "Tue", "Wed", "Thu", "Fri"].includes(weekday);
}

module.exports = {
  getTimeParts,
  isWeekday,
};
