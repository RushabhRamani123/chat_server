const mongoose = require("mongoose");

const groupChatSchema = new mongoose.Schema({
    participants: [
      {
        type: mongoose.Schema.ObjectId,
        ref: "User",
      },
    ],
    group_name: {
      type: String,
    },
    messages: [
      {
        from: {
          type: mongoose.Schema.ObjectId,
          ref: "User",
        },
        type: {
          type: String,
          enum: ["Text", "Media", "Document", "Link"],
        },
        created_at: {
          type: Date,
          default: Date.now(),
        },
        text: {
          type: String,
        },
        file: {
          type: String,
        },
      },
    ],
  });
  
  const GroupChat = new mongoose.model("GroupChat", groupChatSchema);
  module.exports = GroupChat;