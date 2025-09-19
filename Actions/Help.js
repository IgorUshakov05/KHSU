const { Markup } = require("telegraf");

const inGroup = Markup.inlineKeyboard([
  [
    Markup.button.callback("📅 Пары сегодня", "SUBJECT_TODAY"),
    Markup.button.callback("📆 Пары завтра", "SUBJECT_TOMORROW"),
  ],
  [Markup.button.callback("👥 Изменить группу", "SET_COURSE")],
]);

module.exports = (bot) => {
  bot.action("HELP", async (ctx) => {
    await ctx.answerCbQuery();
    const text = `
🆘 *Нужна помощь?*

Если возникла ошибка или что-то не работает, напишите напрямую разработчику:
👤 @O101O1O1O

Мы постараемся ответить как можно быстрее! ⚡

Выберите действие ниже, чтобы продолжить:
`;

    await ctx.reply(text, { ...inGroup, parse_mode: "Markdown" });
  });
};
