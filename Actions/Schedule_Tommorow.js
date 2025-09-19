const { GetUser } = require("../DataBase/Request/User");
const { Temporal } = require("temporal-polyfill");
const { getSchedule } = require("../API/Schedule");
const { Markup } = require("telegraf");
const inGroup = Markup.inlineKeyboard([
  [
    Markup.button.callback("📅 Пары сегодня", "SUBJECT_TODAY"),
    Markup.button.callback("📆 Пары завтра", "SUBJECT_TOMORROW"),
  ],
  [Markup.button.callback("👥 Изменить группу", "SET_COURSE")],
  [Markup.button.callback("🧑‍💻 Связь с поддержкой", "HELP")],

]);
module.exports = (bot) => {
  bot.action("SUBJECT_TOMORROW", async (ctx) => {
    await ctx.answerCbQuery();

    const chatId = ctx.chat.id;
    const user = await GetUser(chatId);

    const today = Temporal.Now.plainDateISO().add({ days: 1 });
    const formatted =
      String(today.day).padStart(2, "0") +
      "." +
      String(today.month).padStart(2, "0") +
      "." +
      today.year;

    console.log("Завтрашняя дата:", formatted);

    if (!user?.group) {
      return ctx.reply("⚠️ Сначала выберите группу с помощью /setcourse");
    }

    const schedule = await getSchedule(user.group, formatted);

    if (!schedule || !schedule.lessons || schedule.lessons.length === 0) {
      return ctx.reply("📭 Завтра занятий нет!");
    }

    let text = `📅 Пары на <b>${formatted}</b> для группы <b>${user.group}</b>:\n\n`;

    schedule.lessons.forEach((lesson) => {
      text +=
        `${lesson.time}. ${lesson.subject} (${lesson.type_lesson})\n` +
        `👨‍🏫 ${lesson.teacher}\n` +
        `🏫 Аудитория: ${lesson.auditory}\n` +
        `🕛 Время: ${lesson.time_start} - ${lesson.time_end}\n\n`;
    }, inGroup);

    await ctx.reply(text, { parse_mode: "HTML" });
  });
};
