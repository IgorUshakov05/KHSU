const axios = require("axios");

async function getSchedule(group, date) {
  try {
    const url = `${process.env.SERVER_URL}/api/getpairs/date:${group}:${date}`;
    const response = await axios.get(url);
    const schedule = response.data;

    const { data: pairsData } = await axios.get(
      `${process.env.SERVER_URL}/api/getpairstime`
    );
    const pairsTime = pairsData.pairs_time || [];

    if (schedule?.lessons?.length > 0) {
      schedule.lessons = schedule.lessons.map((lesson) => {
        const pair = pairsTime.find((p) => p.time === lesson.time);
        return {
          ...lesson,
          time_start: pair?.time_start || null,
          time_end: pair?.time_end || null,
          success: true,
        };
      });
    }

    return { success: true, ...schedule };
  } catch (err) {
    console.error("❌ Ошибка при запросе расписания:", err.message);
    return { success: false };
  }
}

module.exports = { getSchedule };
