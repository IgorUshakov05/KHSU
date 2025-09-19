const axios = require("axios");

async function getGroups(courseNumber) {
  try {
    const url = `https://t2iti.khsu.ru/api/getgroups/${courseNumber}`;
    const response = await axios.get(url);
    return response.data;
  } catch (err) {
    console.error("❌ Ошибка при запросе групп:", err.message);
    throw err;
  }
}

module.exports = { getGroups };
