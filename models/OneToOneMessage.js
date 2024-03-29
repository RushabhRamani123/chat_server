const mongoose = require("mongoose");

const oneToOneMessageSchema = new mongoose.Schema({
  participants: [
    {
      type: mongoose.Schema.ObjectId,
      ref: "User",
    },
  ],
  messages: [
    {
      signigicant: {
        type: String,
        enum: ["archived", "pinned"],
      },
      to: {
        type: mongoose.Schema.ObjectId,
        ref: "User",
      },
      from: {
        type: mongoose.Schema.ObjectId,
        ref: "User",
      },
      type: {
        type: String,
        enum: ["Text", "Media", "Document", "Link","reply","divider"],
      },
      created_at: {
        type: Date,
        default: Date.now(),
      },
      text: {
        type: String,
      },
      reply: {
        type: String,
      },
      file: {
        type: String,
      },
      star: [{
        type: mongoose.Schema.ObjectId,
      }],
      deleted: [{
          type: mongoose.Schema.ObjectId,
      }]
    },
  ],
  divider:[ {
    time:{type: Date,}
  }],
  unread_count:{
    type: Number,
    default: 0 
  }
});

const OneToOneMessage = new mongoose.model(
  "OneToOneMessage",
  oneToOneMessageSchema
);
module.exports = OneToOneMessage;