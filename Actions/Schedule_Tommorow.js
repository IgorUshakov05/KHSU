const { GetUser } = require("../DataBase/Request/User");
const { Temporal } = require("temporal-polyfill");
const { getSchedule } = require("../API/Schedule");
const { Markup } = require("telegraf");
const inGroup = Markup.inlineKeyboard([
  [Markup.button.callback("📅 Пары сегодня", "SUBJECT_TODAY")],
  [Markup.button.callback("👥 Изменить группу", "SET_COURSE")],
  [Markup.button.callback("🧑‍💻 Связь с поддержкой", "HELP")],
]);
module.exports = (bot) => {
  bot.action("SUBJECT_TOMORROW", async (ctx) => {
    try {
      await ctx.answerCbQuery("Загружаю расписание...");

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
        return ctx.reply(
          "⚠️ Сначала выберите группу с помощью кнопки ниже",
          Markup.inlineKeyboard([
            [Markup.button.callback("👥 Выбрать группу", "SET_COURSE")],
          ])
        );
      }

      const schedule = await getSchedule(user.group, formatted);
      console.log(schedule)
      if (!schedule.success) {
        throw Error("Ошибка при получении расписания");
      }
      if (!schedule || !schedule.lessons || schedule.lessons.length === 0) {
        ctx.reply("📭 Завтра занятий нет!");
        return ctx.sendSticker(
          "CAACAgIAAxkBAAICqGjNeQkv44HyJyKFfcBklUfaKMs2AAJYAAPkoM4HrNDsfmL1_f82BA"
        );
      }
      let text = `📅 Пары на <b>${formatted}</b> для группы <b>${user.group}</b>:\n\n`;

      schedule.lessons.forEach((lesson) => {
        text +=
          `${lesson.time}. ${lesson.subject} (${lesson.type_lesson})\n` +
          `👨‍🏫 ${lesson.teacher}\n` +
          `🏫 Аудитория: ${lesson.auditory}\n` +
          `🕛 Время: ${lesson.time_start} - ${lesson.time_end}\n\n`;
      });

      await ctx.reply(text, { parse_mode: "HTML", ...inGroup });
    } catch (error) {
      await ctx.answerCbQuery().catch(() => {});;
      const text = `
🆘 *Нужна помощь?*

Если возникла ошибка или что-то не работает, напишите напрямую разработчику:
👤 @O101O1O1O

Мы постараемся ответить как можно быстрее! ⚡

Выберите действие ниже, чтобы продолжить:
`;

      await ctx.reply(text, { ...inGroup, parse_mode: "Markdown" });
    }
  });
};
