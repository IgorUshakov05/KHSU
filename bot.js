require("dotenv").config();
const { Telegraf, Markup } = require("telegraf");
const { Scenes, session } = require("telegraf");
const mongoose = require("mongoose");
const setCourseWizard = require("./Scene/SelectGroup");
const spamAll = require("./Scene/SendNews");
const spamGroup = require("./Scene/SendNewsGroup");

const {
  RegisterUser,
  SetGroup,
  Set_Admin,
} = require("./DataBase/Request/User");
const stage = new Scenes.Stage([setCourseWizard, spamAll, spamGroup]);

const bot = new Telegraf(process.env.BOT_TOKEN);
const stickers = [
  "CAACAgIAAxkBAAIBkmjNPXna6z2fF7JliaHTy_mlLbXNAAJ7ZgACi9ZgSJ8UvAWRSoHqNgQ",
  "CAACAgIAAxkBAAIBlGjNPXyr62I9x4x2yt17by0sO_1eAAJvcgAC-qpgSFPk7woHnrSNNgQ",
  "CAACAgIAAxkBAAIBlmjNPY15vdADiPOAyTHYgkptCH_CAALbVgACDw9oSHBUChOcKuM-NgQ",
  "CAACAgIAAxkBAAIBmGjNPZT5cA6bs07VkTJ-1qzVoVg4AAJ6ZgACk_lhSGKpRQNWOfuNNgQ",
  "CAACAgIAAxkBAAIBmmjNPZ7slWue0vR6RFlK7b5hSEIUAAJBaQACZ35hSA3z4hAvmDxVNgQ",
];

async function sendRandomSticker(ctx) {
  const randomIndex = Math.floor(Math.random() * stickers.length);
  const stickerId = stickers[randomIndex];
  await ctx.sendSticker(stickerId);
}
bot.use(session());
bot.use(stage.middleware());

const inGroup = Markup.inlineKeyboard([
  [
    Markup.button.callback("📅 Пары сегодня", "SUBJECT_TODAY"),
    Markup.button.callback("📆 Пары завтра", "SUBJECT_TOMORROW"),
  ],
  [Markup.button.callback("👥 Изменить группу", "SET_COURSE")],
  [Markup.button.callback("🧑‍💻 Связь с поддержкой", "HELP")],
]);

bot.start(async (ctx) => {
  const chat_id = ctx.chat.id;
  const fullname = `${ctx.from.first_name || ""} ${
    ctx.from.last_name || ""
  }`.trim();

  let save_user = await RegisterUser({ chat_id, fullname });
  console.log(save_user);

  // Стикер приветствия
  await sendRandomSticker(ctx);
  await ctx.reply(
    `${save_user.message}`,
    !!save_user.user.group
      ? inGroup
      : Markup.inlineKeyboard([
          Markup.button.callback(
            `${save_user.success ? "Указать группу" : "Изменить группу"}`,
            "SET_COURSE"
          ),
        ])
  );
});

bot.action(/GROUP_(.+)/, async (ctx) => {
  try {
    await ctx.answerCbQuery().catch(() => {});
    const group = ctx.match[1];
    const chatId = ctx.chat.id;
    const result = await SetGroup({ chatId, group });

    // Стикер подтверждения выбора группы
    await ctx.sendSticker(
      "CAACAgIAAxkBAAEEd2Fj8KmVt0K1Zx2pXGRK1b0Y9XcUigACVAADVp29CKHhKdN9SVXrHwQ"
    ); // пример стикера

    await ctx.reply(`Вы выбрали группу: ${group}\n${result.message}`);
  } catch (err) {
    console.error("❌ Ошибка при выборе группы:", err);
    await ctx.reply(
      "❌ Произошла ошибка при сохранении группы. Попробуйте позже."
    );
  }
});

// Поставить курс
bot.action("SET_COURSE", async (ctx) => {
  ctx.answerCbQuery().catch(() => {});
  await ctx.scene.enter("SET_COURSE");
});

// Общая рассылка
bot.action("BROADCAST_ALL", async (ctx) => {
  ctx.answerCbQuery().catch(() => {});
  await ctx.scene.enter("BROADCAST_ALL");
});

// Рассылка для группы
bot.action("BROADCAST_GROUP", async (ctx) => {
  ctx.answerCbQuery().catch(() => {});
  await ctx.scene.enter("BROADCAST_GROUP");
});

bot.command("setcourse", async (ctx) => {
  await ctx.scene.enter("SET_COURSE");
});

// Действие команды
bot.command(process.env.ADMIN_COMMAND, async (ctx) => {
  const chat_id = ctx.chat.id;
  await Set_Admin(chat_id);

  await ctx.reply(
    `⚡️ <b>Админ-панель</b> ⚡️\n
🛠 Здесь вы можете управлять рассылками.\n
Выберите действие ниже 👇`,
    {
      parse_mode: "HTML",
      ...Markup.inlineKeyboard([
        [Markup.button.callback("📢 Общая рассылка", "BROADCAST_ALL")],
        [Markup.button.callback("👥 Рассылка для группы", "BROADCAST_GROUP")],
      ]),
    }
  );
});
async function connectDB() {
  try {
    let uri =
      process.env.MODE === "DEV"
        ? process.env.MONGO_URI_DEV
        : process.env.MONGO_URI_PROD;
    console.log(uri);
    await mongoose.connect(uri);
    console.log("✅ MongoDB подключен");
  } catch (err) {
    console.error("❌ Ошибка подключения к MongoDB:", err.message);
    process.exit(1);
  }
}

// Подключение расписаний
require("./Actions/Schedule")(bot);
require("./Actions/Schedule_Tommorow")(bot);

// Поддержка
require("./Actions/Help")(bot);
bot.on("message", async (ctx) => {
  const { chat, message_id, from } = ctx.message;

  console.log(
    `Новое сообщение от ${from.first_name} (${
      from.username || "нет юзернейма"
    })`
  );
  if (ctx.message.text) console.log("Текст:", ctx.message.text);
  if (ctx.message.sticker)
    console.log("Стикер file_id:", ctx.message.sticker.file_id);
  if (ctx.message.photo)
    console.log(
      "Фото:",
      ctx.message.photo.map((p) => p.file_id)
    );

  try {
    // Пересылаем сообщение в DEV_CHAT_ID с сохранением имени отправителя
    await ctx.telegram.forwardMessage(
      process.env.DEV_CHAT_ID, // куда пересылаем
      chat.id, // откуда
      message_id // ID сообщения
    );
    console.log("Сообщение успешно переслано в DEV");
  } catch (e) {
    console.log("Ошибка при пересылке в DEV:", e);
  }
});
// Запуск
(async () => {
  console.log("Начало запуска");

  await connectDB();

  await bot.launch();
  console.log("🤖 Bot started (polling).");
})();

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
