const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  chatId: {
    type: Number,
    required: true,
    unique: true,
  },
  fullname: {
    type: String,
    required: true,
    trim: true,
  },
  role: {
    type: String,
    default: "student",
  },
  group: {
    type: String,
    required: false,
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const User = mongoose.model("User", UserSchema);

module.exports = User;
