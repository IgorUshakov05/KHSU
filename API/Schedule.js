const axios = require("axios");

async function getSchedule(group, date) {
  try {
    const url = `https://t2iti.khsu.ru/api/getpairs/date:${group}:${date}`;
    const response = await axios.get(url);
    const schedule = response.data;

    const { data: pairsData } = await axios.get("https://t2iti.khsu.ru/api/getpairstime");
    const pairsTime = pairsData.pairs_time || [];

    if (schedule?.lessons?.length > 0) {
      schedule.lessons = schedule.lessons.map((lesson) => {
        const pair = pairsTime.find((p) => p.time === lesson.time);
        return {
          ...lesson,
          time_start: pair?.time_start || null,
          time_end: pair?.time_end || null,
        };
      });
    }

    return schedule;
  } catch (err) {
    console.error("❌ Ошибка при запросе расписания:", err.message);
    throw err;
  }
}

module.exports = { getSchedule };
