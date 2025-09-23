const axios = require("axios");

async function getGroups(courseNumber) {
  try {
    const url = `${process.env.SERVER_URL}/api/getgroups/${courseNumber}`;
    const response = await axios.get(url);
    return { group: response.data, success: true };
  } catch (err) {
    console.error("❌ Ошибка при запросе групп:", err.message);
    return { group: null, success: false };
  }
}

module.exports = { getGroups };
