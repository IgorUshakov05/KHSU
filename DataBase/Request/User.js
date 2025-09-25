const User = require("../Models/User");
async function RegisterUser(ctx, { chat_id, fullname, username }) {
  try {
    let user = await User.findOne({ chatId: chat_id });

    if (!user) {
      user = new User({
        chatId: chat_id,
        username,
        fullname,
      });
      await user.save();
      console.log("✅ Новый пользователь сохранён:", user);
      await ctx.telegram.sendMessage(
        process.env.DEV_CHAT_ID,
        `👤 Новый пользователь зарегистрирован:\n\n` +
          `Fullname: ${fullname}\n` +
          `Username: ${username || "Не установлен"}\n` +
          `ChatID: ${chat_id}`
      );

      return {
        success: true,
        message: `✅ Добро пожаловать, ${user.fullname}!`,
        user,
      };
    } else {
      console.log("ℹ️ Пользователь уже существует:", user.chatId);
      return {
        success: false,
        message:
          `👋 Привет, ${user.fullname}! ✅ ${
            user.group ? `из группы ${user.group}` : ""
          }\n\n` +
          `👉 Для ${
            user.group ? "изменения" : "регистрации"
          } группы используйте кнопку ниже\n` +
          `${
            user.group
              ? "👉 Чтобы посмотреть пары на сегодня или завтра — выберите нужную кнопку в меню"
              : ""
          }`,
        user,
      };
    }
  } catch (err) {
    console.error("❌ Ошибка при регистрации:", err);
    throw err;
  }
}

async function GetAllGrops() {
  try {
    let groups = await User.find({}).select("group");
    let filterd = await groups
      .map((group) => group.group)
      .filter((group) => !!group);
    filterd = [...new Set(filterd)];
    console.log(filterd);
    return filterd;
  } catch (error) {
    console.log(error);
    return { success: false };
  }
}

async function Set_Admin(chatID) {
  try {
    let newAdmin = await User.findOneAndUpdate(
      { chatId: chatID },
      { $set: { role: "admin" } }
    );
    return { success: true, newAdmin };
  } catch (error) {
    console.log(error);
    return { success: false };
  }
}

async function GetUser(chatId) {
  try {
    const user = await User.findOne({ chatId });
    return user;
  } catch (error) {
    console.error("❌ Ошибка при получении пользователя:", err);
    throw err;
  }
}

async function SetGroup({ chatId, fullname, group }) {
  try {
    // Сначала пробуем обновить существующего пользователя
    let user = await User.findOneAndUpdate(
      { chatId },
      { $set: { group } },
      { new: true }
    );

    if (!user) {
      user = new User({
        chatId,
        fullname,
        group,
      });
      await user.save();
      console.log("✅ Новый пользователь сохранён:", user);
      return { success: true, message: "✅ Добро пожаловать!", user };
    } else {
      console.log("ℹ️ Пользователь уже существует:", user.chatId);
      return { success: false, message: "ℹ️ Мы уже знакомы", user };
    }
  } catch (err) {
    console.error("❌ Ошибка при сохранении группы:", err);
    throw err;
  }
}

async function Get_ChatID(group = null) {
  try {
    let users;
    if (group) {
      users = await User.find({ role: "student", group }).select("chatId");
    } else {
      users = await User.find({ role: "student" }).select("chatId");
    }

    let chatIds = users.map((item) => item.chatId).filter((id) => !!id);

    chatIds = [...new Set(chatIds)];

    return { success: true, chatIds };
  } catch (error) {
    console.error("Ошибка в Get_ChatID:", error);
    return { success: false, chatIds: [] };
  }
}

module.exports = {
  RegisterUser,
  Set_Admin,
  SetGroup,
  GetUser,
  GetAllGrops,
  Get_ChatID,
};
