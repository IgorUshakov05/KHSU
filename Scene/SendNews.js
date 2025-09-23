const { Scenes, Markup } = require("telegraf");
const { WizardScene } = Scenes;
const { Get_ChatID } = require("../DataBase/Request/User");

const inGroup = Markup.inlineKeyboard([
  [Markup.button.callback("📢 Общая рассылка", "BROADCAST_ALL")],
  [Markup.button.callback("👥 Рассылка для группы", "BROADCAST_GROUP")],
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

// ------------------- Шаг 1: Ввод сообщения -------------------
const step1 = async (ctx) => {
  await deletePrevMessage(ctx);

  const sent = await ctx.reply(
    "✍️ Введите текст для рассылки:\n\n<i>После этого бот спросит подтверждение</i>",
    { parse_mode: "HTML" }
  );

  ctx.wizard.state.lastBotMessageId = sent.message_id;
  return ctx.wizard.next();
};

// ------------------- Шаг 2: Подтверждение -------------------
const step2 = async (ctx) => {
  await deletePrevMessage(ctx);

  if (!ctx.message?.text) {
    const sent = await ctx.reply("⚠️ Пожалуйста, введите именно текстовое сообщение!");
    ctx.wizard.state.lastBotMessageId = sent.message_id;
    return;
  }

  ctx.wizard.state.broadcastMessage = ctx.message.text;

  const sent = await ctx.reply(
    `📨 <b>Сообщение для рассылки:</b>\n\n${ctx.wizard.state.broadcastMessage}\n\nПодтвердить отправку?`,
    {
      parse_mode: "HTML",
      ...Markup.inlineKeyboard([
        [Markup.button.callback("✅ Отправить", "CONFIRM_SEND")],
        [Markup.button.callback("❌ Отмена", "CANCEL_SEND")],
      ]),
    }
  );

  ctx.wizard.state.lastBotMessageId = sent.message_id;
  return ctx.wizard.next();
};

// ------------------- Шаг 3: Выполнение -------------------
const step3 = async (ctx) => {
  if (!ctx.callbackQuery) return;

  const action = ctx.callbackQuery.data;
  await ctx.answerCbQuery().catch(() => {});;
  await deletePrevMessage(ctx);

  if (action === "CONFIRM_SEND") {
    const { success, chatIds } = await Get_ChatID();
    if (!success) {
      await ctx.reply("❌ Ошибка при получении списка чатов.");
      return ctx.scene.leave();
    }

    let count = 0;
    for (const id of chatIds) {
      try {
        await ctx.telegram.sendMessage(id, ctx.wizard.state.broadcastMessage, {
          parse_mode: "HTML",
        });
        count++;
      } catch (e) {
        console.log("Ошибка при отправке:", e);
      }
    }

    await ctx.reply(`✅ Рассылка завершена!\nОтправлено: <b>${count}</b> сообщений.`, {
      parse_mode: "HTML",...inGroup
    });
  } else {
    await ctx.reply("❌ Рассылка отменена.",{...inGroup});
  }

  return ctx.scene.leave();
};

const broadcastWizard = new WizardScene(
  "BROADCAST_ALL",
  step1,
  step2,
  step3
);

module.exports = broadcastWizard;
