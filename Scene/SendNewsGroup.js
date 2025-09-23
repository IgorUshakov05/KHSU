const { Scenes, Markup } = require("telegraf");
const { WizardScene } = Scenes;
const { Get_ChatID, GetAllGrops } = require("../DataBase/Request/User");

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

// ------------------- Шаг 0: выбор группы -------------------
const step0 = async (ctx) => {
  await deletePrevMessage(ctx);

  const allGroups = await GetAllGrops();
  if (!allGroups?.length) {
    await ctx.reply("❌ Не найдено ни одной группы.");
    return ctx.scene.leave();
  }

  const keyboard = Markup.inlineKeyboard(
    allGroups.map((group) => [
      Markup.button.callback(group, `SELECT_GROUP_${group}`),
    ])
  );

  const sent = await ctx.reply("👥 Выберите группу для рассылки:", keyboard);
  ctx.wizard.state.lastBotMessageId = sent.message_id;

  return ctx.wizard.next();
};

// ------------------- Шаг 1: ввод текста -------------------
const step1 = async (ctx) => {
  if (!ctx.callbackQuery) {
    return ctx.reply("⚠️ Сначала выберите группу из списка.");
  }

  const action = ctx.callbackQuery.data;
  if (!action.startsWith("SELECT_GROUP_")) return;

  ctx.wizard.state.selectedGroup = action.replace("SELECT_GROUP_", "");
  await ctx.answerCbQuery().catch(() => {});
  await deletePrevMessage(ctx);

  const sent = await ctx.reply(
    `✍️ Введите текст для рассылки в группу <b>${ctx.wizard.state.selectedGroup}</b>:`,
    { parse_mode: "HTML" }
  );
  ctx.wizard.state.lastBotMessageId = sent.message_id;

  return ctx.wizard.next();
};

// ------------------- Шаг 2: подтверждение -------------------
const step2 = async (ctx) => {
  if (!ctx.message?.text) {
    const sent = await ctx.reply(
      "⚠️ Пожалуйста, введите именно текстовое сообщение!"
    );
    ctx.wizard.state.lastBotMessageId = sent.message_id;
    return;
  }

  ctx.wizard.state.broadcastMessage = ctx.message.text;
  await deletePrevMessage(ctx);

  const sent = await ctx.reply(
    `📨 <b>Сообщение для рассылки в группу ${ctx.wizard.state.selectedGroup}:</b>\n\n${ctx.wizard.state.broadcastMessage}\n\nПодтвердить отправку?`,
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

// ------------------- Шаг 3: выполнение -------------------
const step3 = async (ctx) => {
  if (!ctx.callbackQuery) return;

  const action = ctx.callbackQuery.data;
  await ctx.answerCbQuery().catch(() => {});
  await deletePrevMessage(ctx);

  if (action === "CONFIRM_SEND") {
    const { success, chatIds } = await Get_ChatID(
      ctx.wizard.state.selectedGroup
    );
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

    await ctx.reply(
      `✅ Рассылка завершена!\nГруппа: <b>${ctx.wizard.state.selectedGroup}</b>\nОтправлено: <b>${count}</b> сообщений.`,
      { parse_mode: "HTML", ...inGroup }
    );
  } else {
    await ctx.reply("❌ Рассылка отменена.",{...inGroup});
  }

  return ctx.scene.leave();
};

const broadcastGroupWizard = new WizardScene(
  "BROADCAST_GROUP",
  step0,
  step1,
  step2,
  step3
);

module.exports = broadcastGroupWizard;
