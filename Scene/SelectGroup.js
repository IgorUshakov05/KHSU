const { Scenes, Markup } = require("telegraf");
const { WizardScene } = Scenes;
const { getGroups } = require("../API/Requests");
const { SetGroup } = require("../DataBase/Request/User");

const inGroup = Markup.inlineKeyboard([
  [
    Markup.button.callback("📅 Пары сегодня", "SUBJECT_TODAY"),
    Markup.button.callback("📆 Пары завтра", "SUBJECT_TOMORROW"),
  ],
  [Markup.button.callback("👥 Изменить группу", "SET_COURSE")],
  [Markup.button.callback("🧑‍💻 Связь с поддержкой", "HELP")],
]);

// Хелпер: удалить предыдущее сообщение бота
async function deletePrevMessage(ctx) {
  const prevId = ctx.wizard.state.lastBotMessageId;
  if (prevId) {
    try {
      await ctx.deleteMessage(prevId);
    } catch (e) {
      console.log(e, " - ошибка при удалении сообщения");
    }
  }
}

// ------------------- Шаг 1: выбор курса -------------------
const step1 = async (ctx) => {
  await deletePrevMessage(ctx);

  const sent = await ctx.reply(
    "📘 На каком вы курсе? 🎓",
    Markup.keyboard([["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣"], ["⏭️ Пропустить"]])
      .oneTime()
      .resize()
  );

  ctx.wizard.state.lastBotMessageId = sent.message_id;
  return ctx.wizard.next();
};

// ------------------- Шаг 2: выбор группы -------------------
const step2 = async (ctx) => {
  const text = String(ctx.message.text).trim();

  if (text.includes("Пропустить")) {
    await deletePrevMessage(ctx);

    const sent = await ctx.reply(
      "⏭️ Курс пропущен. Вы сможете выбрать его позже с помощью команды /setcourse ⚙️",
      Markup.removeKeyboard()
    );

    ctx.wizard.state.lastBotMessageId = sent.message_id;
    return ctx.scene.leave();
  }

  if (/^[1-5]$/.test(text) || /^[1-5]️⃣$/.test(text)) {
    ctx.session.course = text.replace("️⃣", "");
    const groupsData = await getGroups(ctx.session.course);
    if (!groupsData.success) {
      const text = `
🆘 *Возникла ошика?*

Напишите напрямую разработчику:
👤 @O101O1O1O

Мы постараемся ответить как можно быстрее! ⚡

Выберите действие ниже, чтобы продолжить:
`;

      await ctx.reply(text, { ...inGroup, parse_mode: "Markdown" });
      return ctx.scene.leave();
    }
    ctx.session.availableGroups = groupsData.group.groups;

    await deletePrevMessage(ctx);

    const keyBoard = Markup.inlineKeyboard(
      groupsData.group.groups.map((group) => [
        Markup.button.callback(`📚 ${group}`, `GROUP_${group}`),
      ])
    );

    const sent = await ctx.reply("👥 Выберите вашу группу:", keyBoard);
    ctx.wizard.state.lastBotMessageId = sent.message_id;
    return ctx.wizard.next();
  }

  return ctx.reply(
    '⚠️ Пожалуйста, выберите кнопку "1️⃣–5️⃣" или "⏭️ Пропустить".'
  );
};

// ------------------- Шаг 3: обработка выбора группы -------------------
const finishStep = async (ctx) => {
  const data = ctx.update.callback_query?.data;

  if (data === "BACK") {
    await ctx.answerCbQuery().catch(() => {});;
    return ctx.wizard.selectStep(0); // возвращаемся к выбору курса
  }

  const match = data.match(/^GROUP_(.+)$/);
  if (!match) return ctx.reply("⚠️ Пожалуйста, выберите группу кнопкой.");

  const group = match[1];
  const chatId = ctx.chat.id;
  const fullname = ctx.from.first_name + " " + (ctx.from.last_name || "");
  await SetGroup({ chatId, fullname, group });

  await ctx.answerCbQuery().catch(() => {});;
  await deletePrevMessage(ctx);

  const sent = await ctx.reply(`✅ Вы выбрали группу: <b>${group}</b> 🎉`, {
    parse_mode: "HTML",
  });

  await ctx.reply(`✨ Выберите действие:`, inGroup);

  ctx.wizard.state.lastBotMessageId = sent.message_id;
  return ctx.scene.leave();
};

const setCourseWizard = new WizardScene("SET_COURSE", step1, step2, finishStep);

module.exports = setCourseWizard;
