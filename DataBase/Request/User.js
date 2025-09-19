const User = require("../Models/User");

async function RegisterUser({ chat_id, fullname, group }) {
  try {
    let user = await User.findOne({ chatId: chat_id });

    if (!user) {
      user = new User({
        chatId: chat_id,
        fullname,
        group,
      });
      await user.save();
      console.log("✅ Новый пользователь сохранён:", user);
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
      // Если пользователя нет — создаём нового
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

module.exports = { RegisterUser, SetGroup, GetUser };
