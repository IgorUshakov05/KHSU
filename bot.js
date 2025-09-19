require("dotenv").config();
const { Telegraf, Markup } = require("telegraf");
const { Scenes, session } = require("telegraf");
const mongoose = require("mongoose");
const setCourseWizard = require("./Scene/SelectGroup");
const { RegisterUser, SetGroup } = require("./DataBase/Request/User"); // добавил SetGroup
const stage = new Scenes.Stage([setCourseWizard]);

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

bot.on("sticker", async (ctx) => {
  console.log("Sticker file_id:", ctx.message.sticker.file_id);
  await ctx.reply("Файл стикера получен ✅");
});

bot.start(async (ctx) => {
  const chat_id = ctx.chat.id;
  const fullname = `${ctx.from.first_name || ""} ${
    ctx.from.last_name || ""
  }`.trim();

  let save_user = await RegisterUser({ chat_id, fullname });
  console.log(save_user);

  // Стикер приветствия
  // await sendRandomSticker(ctx)
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
    const group = ctx.match[1];
    const chatId = ctx.chat.id;
    const result = await SetGroup({ chatId, group });

    await ctx.answerCbQuery(); // убираем "часики" на кнопке

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

bot.action("SET_COURSE", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.scene.enter("SET_COURSE");
});

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
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


// Запуск
(async () => {
  await connectDB();
  await bot.launch();
  console.log("🤖 Bot started (polling).");
})();

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
