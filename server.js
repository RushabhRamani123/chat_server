const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
dotenv.config({ path: "./.env" });

process.on("uncaughtException", (err) => {
  console.log(err);
  console.log("UNCAUGHT Exception! Shutting down ...");
  process.exit(1); // Exit Code 1 indicates that a container shut down, either because of an application failure.
});

const app = require("./app");
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io"); // Add this
const { promisify } = require("util");
const User = require("./models/user");
const FriendRequest = require("./models/friendRequest");
const OneToOneMessage = require("./models/OneToOneMessage");
const AudioCall = require("./models/audioCall");
const VideoCall = require("./models/videoCall");
const GroupChat = require("./models/groupChats");
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3001",
    methods: ["GET", "POST"],
  },
});
mongoose
  .connect(
    `mongodb+srv://${process.env.MONGO_DB_USER}:${process.env.MONGO_DB_PASSWORD}@chatapplication.gyrz9ha.mongodb.net/?retryWrites=true&w=majority`,
    {}
  )
  .then(() => {
    console.log("Database connected");
  })
  .catch((err) => {
    console.log(err);
  });

const port = process.env.PORT || 8000;

server.listen(port, () => {
  console.log(`App running on port ${port} ...`);
});
io.on("connection", async (socket) => {
  console.log("New connection");
  console.log(JSON.stringify(socket.handshake.query));
  const user_id = socket.handshake.query["user_id"];
  console.log("This is the logging of the user_id of the handshake query")
  console.log(user_id); 
  console.log(`User connected ${socket.id}`);
  console.log("before entering the if conditon"); 
  if (user_id != null && Boolean(user_id)) {
    console.log("entering the if condition"); 
    console.log("This is the socket id:" + socket.id);
    try {
      await User.findByIdAndUpdate(user_id, {
        socket_id: socket.id,
        status: "Online",
      })

    }
     catch (e) {
      console.log(e.message);
    }
  }
  socket.on("friend_request", async (data) => {
    const to = await User.findById(data.to).select("socket_id");
    const from = await User.findById(data.from).select("socket_id");

    // create a friend request
    await FriendRequest.create({
      sender: data.from,
      recipient: data.to,
    });
    // emit event request received to recipient
    io.to(to?.socket_id).emit("new_friend_request", {
      message: "New friend request received",
    });
    io.to(from?.socket_id).emit("request_sent", {
      message: "Request Sent successfully!",
    });
  });
  socket.on("accept_request", async (data) => {
    // accept friend request => add ref of each other in friends array
    console.log(data);
    const request_doc = await FriendRequest.findById(data.request_id);

    console.log(request_doc);

    const sender = await User.findById(request_doc.sender);
    const receiver = await User.findById(request_doc.recipient);

    sender.friends.push(request_doc.recipient);
    receiver.friends.push(request_doc.sender);

    await receiver.save({ new: true, validateModifiedOnly: true });
    await sender.save({ new: true, validateModifiedOnly: true });

    await FriendRequest.findByIdAndDelete(data.request_id);

    // delete this request doc
    // emit event to both of them

    // emit event request accepted to both
    io.to(sender?.socket_id).emit("request_accepted", {
      message: "Friend Request Accepted",
    });
    io.to(receiver?.socket_id).emit("request_accepted", {
      message: "Friend Request Accepted",
    });
  });
  socket.on("get_direct_conversations", async ({ user_id }, callback) => {
    const existing_conversations = await OneToOneMessage.find({
      participants: { $all: [user_id] },
    }).populate("participants", "firstName lastName avatar _id email status about");

    // db.books.find({ authors: { $elemMatch: { name: "John Smith" } } })
    console.log("This is to get the information");
    console.log(existing_conversations);

    callback(existing_conversations);
  });
  socket.on("start_conversation", async (data) => {
    // data: {to: from:}
    const { to, from } = data;
    // check if there is any existing conversation
    const existing_conversations = await OneToOneMessage.find({
      participants: { $size: 2, $all: [to, from] },
    }).populate("participants", "firstName lastName _id email status about");

    console.log(existing_conversations[0], "Existing Conversation");
    console.log("next")
    // if no => create a new OneToOneMessage doc & emit event "start_chat" & send conversation details as payload
    if (existing_conversations.length === 0) {
      let new_chat = await OneToOneMessage.create({
        participants: [to, from],
      });
      console.log("agter")
      new_chat = await OneToOneMessage.findById(new_chat).populate(
        "participants",
        "firstName lastName _id email status"
      );

      console.log(new_chat);

      socket.emit("start_chat", new_chat);
    }
    // if yes => just emit event "start_chat" & send conversation details as payload
    else {
      socket.emit("start_chat", existing_conversations[0]);
    }
  });
  socket.on("get_messages", async (data, callback) => {
    console.log("get_messages");
    console.log(data);
    try {
      const chat = await OneToOneMessage.findById(data.conversation_id);
      if (chat) {
        let divider = chat.divider ? chat.divider : [];
        const messages = chat.messages || [];
  
        console.log("chat:", chat);
        console.log("divider:", divider);
        console.log("messages:", messages);
  
        const str = divider.length > 0 ? divider[divider.length - 1]?.time : null;
        let date = null;
        if (str !== null) date = new Date(str);
        const now = new Date();
  
        if (date === null || date.getDate() !== now.getDate()) {
          if (messages.length > 0 && messages[messages.length - 1]?.type === 'divider') {
            let new_divider = { time: Date.now() };
            console.log("new_divider:", new_divider);
            chat.divider.push(new_divider);
  
            let new_m = { type: 'divider', created_at: Date.now() };
            chat.messages[messages.length - 1] = new_m;
            await chat.save({ new: true, validateModifiedOnly: true });
          } else {
            let new_divider = { time: Date.now() };
            console.log("new_divider:", new_divider);
            chat.divider.push(new_divider);
  
            let new_m = { type: 'divider', created_at: Date.now() };
            chat.messages.push(new_m);
            await chat.save({ new: true, validateModifiedOnly: true });
          }
        }
  
        const messageQuery = await OneToOneMessage.findById(data.conversation_id)
          .select("messages")
          .select("divider");
  
        if (messageQuery) {
          callback(messageQuery);
        } else {
          callback(null);
        }
      } else {
        console.log("No chat found with the provided conversation_id");
        callback(null);
      }
    } catch (error) {
      console.log(error);
    }
  });
  socket.on("text_message", async (data) => {
    console.log("Received message:", data);
    
    // data: {to, from, text}

    const { message, conversation_id, from, to, type, reply } = data;

    const to_user = await User.findById(to);
    const from_user = await User.findById(from);

    // message => {to, from, type, created_at, text, file}
    console.log(to_user);
    console.log(from_user);
    let new_message = {};
    if (type == "reply") {
      new_message = {
        to: to,
        from: from,
        type: type,
        created_at: Date.now(),
        text: message,
        reply: reply,
      };
    } else {
      new_message = {
        to: to,
        from: from,
        type: type,
        created_at: Date.now(),
        text: message,
      };
    }
    let count = 3;
    console.log("This is the new message" + new_message);
    console.log(conversation_id);
    // fetch OneToOneMessage Doc & push a new message to existing conversation
    const chat = await OneToOneMessage.findById(conversation_id);
    chat.messages.push(new_message);
    // save to db`
    console.log(count); 
    await chat.save({ new: true, validateModifiedOnly: true });
    console.log("this is the socket id ");
    // emit incoming_message -> to user
    console.log(to_user.socket_id);
    console.log(from_user.socket_id);
    io.to(to_user.socket_id).emit("new_message", {
      conversation_id,
      message: new_message,
      count: count,
    });

    // emit outgoing_message -> from user
    io.to(from_user.socket_id).emit("new_message", {
      conversation_id,
      message: new_message,
    });
  });
  socket.on("file_message", (data) => {
    console.log("Received message:", data);

    // data: {to, from, text, file}

    // Get the file extension
    const fileExtension = path.extname(data.file.name);

    // Generate a unique filename
    const filename = `${Date.now()}_${Math.floor(
      Math.random() * 10000
    )}${fileExtension}`;

    // upload file to AWS s3

    // create a new conversation if its dosent exists yet or add a new message to existing conversation

    // save to db

    // emit incoming_message -> to user

    // emit outgoing_message -> from user
  });
  socket.on("Common_Groups", async(data,callback) => {
    let u_1 = data[0]; 
    let u_2 = data[1]; 
    const existing_conversations = await GroupChat.find({
      participants: {
        $all: [u_1, u_2]
      }
    }).populate("participants", "group_name");
    console.log("This is the common group"); 
    let name = existing_conversations.map((el) => el.group_name);
    console.log(name); 
    callback(name)
  })
  socket.on("start_audio_call", async (data) => {
    const { from, to, roomID } = data;

    const to_user = await User.findById(to);
    const from_user = await User.findById(from);

    console.log("to_user", to_user);

    // send notification to receiver of call
    io.to(to_user?.socket_id).emit("audio_call_notification", {
      from: from_user,
      roomID,
      streamID: from,
      userID: to,
      userName: to,
    });
  });
  socket.on("audio_call_not_picked", async (data) => {
    console.log(data);
    // find and update call record
    const { to, from } = data;

    const to_user = await User.findById(to);

    await AudioCall.findOneAndUpdate(
      {
        participants: { $size: 2, $all: [to, from] },
      },
      { verdict: "Missed", status: "Ended", endedAt: Date.now() }
    );

    // TODO => emit call_missed to receiver of call
    io.to(to_user?.socket_id).emit("audio_call_missed", {
      from,
      to,
    });
  });
  socket.on("audio_call_accepted", async (data) => {
    const { to, from } = data;

    const from_user = await User.findById(from);

    // find and update call record
    await AudioCall.findOneAndUpdate(
      {
        participants: { $size: 2, $all: [to, from] },
      },
      { verdict: "Accepted" }
    );

    // TODO => emit call_accepted to sender of call
    io.to(from_user?.socket_id).emit("audio_call_accepted", {
      from,
      to,
    });
  });
  socket.on("audio_call_denied", async (data) => {
    // find and update call record
    const { to, from } = data;

    await AudioCall.findOneAndUpdate(
      {
        participants: { $size: 2, $all: [to, from] },
      },
      { verdict: "Denied", status: "Ended", endedAt: Date.now() }
    );

    const from_user = await User.findById(from);
    // TODO => emit call_denied to sender of call

    io.to(from_user?.socket_id).emit("audio_call_denied", {
      from,
      to,
    });
  });
  socket.on("user_is_busy_audio_call", async (data) => {
    const { to, from } = data;
    // find and update call record
    await AudioCall.findOneAndUpdate(
      {
        participants: { $size: 2, $all: [to, from] },
      },
      { verdict: "Busy", status: "Ended", endedAt: Date.now() }
    );

    const from_user = await User.findById(from);
    // TODO => emit on_another_audio_call to sender of call
    io.to(from_user?.socket_id).emit("on_another_audio_call", {
      from,
      to,
    });
  });
  socket.on("start_video_call", async (data) => {
    const { from, to, roomID } = data;

    console.log(data);

    const to_user = await User.findById(to);
    const from_user = await User.findById(from);

    console.log("to_user", to_user);

    // send notification to receiver of call
    io.to(to_user?.socket_id).emit("video_call_notification", {
      from: from_user,
      roomID,
      streamID: from,
      userID: to,
      userName: to,
    });
  });
  socket.on("video_call_not_picked", async (data) => {
    console.log(data);
    // find and update call record
    const { to, from } = data;

    const to_user = await User.findById(to);

    await VideoCall.findOneAndUpdate(
      {
        participants: { $size: 2, $all: [to, from] },
      },
      { verdict: "Missed", status: "Ended", endedAt: Date.now() }
    );

    // TODO => emit call_missed to receiver of call
    io.to(to_user?.socket_id).emit("video_call_missed", {
      from,
      to,
    });
  });
  socket.on("video_call_accepted", async (data) => {
    const { to, from } = data;

    const from_user = await User.findById(from);

    // find and update call record
    await VideoCall.findOneAndUpdate(
      {
        participants: { $size: 2, $all: [to, from] },
      },
      { verdict: "Accepted" }
    );

    // TODO => emit call_accepted to sender of call
    io.to(from_user?.socket_id).emit("video_call_accepted", {
      from,
      to,
    });
  });
  socket.on("video_call_denied", async (data) => {
    // find and update call record
    const { to, from } = data;

    await VideoCall.findOneAndUpdate(
      {
        participants: { $size: 2, $all: [to, from] },
      },
      { verdict: "Denied", status: "Ended", endedAt: Date.now() }
    );

    const from_user = await User.findById(from);
    // TODO => emit call_denied to sender of call

    io.to(from_user?.socket_id).emit("video_call_denied", {
      from,
      to,
    });
  });
  socket.on("user_is_busy_video_call", async (data) => {
    const { to, from } = data;
    // find and update call record
    await VideoCall.findOneAndUpdate(
      {
        participants: { $size: 2, $all: [to, from] },
      },
      { verdict: "Busy", status: "Ended", endedAt: Date.now() }
    );

    const from_user = await User.findById(from);
    // TODO => emit on_another_video_call to sender of call
    io.to(from_user?.socket_id).emit("on_another_video_call", {
      from,
      to,
    });
  });
  socket.on("createGroup", async (data) => {
    console.log(data);
    try {
      const group = new GroupChat({
        group_name: data.title,
        participants: data.members.map((id) => new mongoose.Types.ObjectId(id)),
      });
      await group.save();
      const user = await User.findById(user_id);
      await user.save();
      console.log("Group created:", group);
    } catch (error) {
      console.error("Error creating group:", error);
    }
  });
  socket.on("get_group", async (callback) => {
    const existing_conversations = await GroupChat.find({
      participants: { $all: [user_id] },
    }).populate("participants", "group_name firstName lastName avatar _id email status about ");

    // db.books.find({ authors: { $elemMatch: { name: "John Smith" } } })

    console.log(existing_conversations);

    callback(existing_conversations);
  });
  socket.on("get_group_messages", async (data, callback) => {
    console.log("This is the group data: ",data); 
    try {
      console.log(data);
      const chat = await GroupChat.findById(data.conversation_id);
      if (chat) {
        let divider = chat.divider ? chat.divider : [];
        const messages = chat.messages || [];
  
        console.log("chat:", chat);
        console.log("divider:", divider);
        console.log("messages:", messages);
  
        const str = divider.length > 0 ? divider[divider.length - 1]?.time : null;
        let date = null;
        if (str !== null) date = new Date(str);
        const now = new Date();
  
        if (date === null || date.getDate() !== now.getDate()) {
          if (messages.length > 0 && messages[messages.length - 1]?.type === 'divider') {
            let new_divider = { time: Date.now() };
            console.log("new_divider:", new_divider);
            chat.divider.push(new_divider);
  
            let new_m = { type: 'divider', created_at: Date.now() };
            chat.messages[messages.length - 1] = new_m;
            await chat.save({ new: true, validateModifiedOnly: true });
          } else {
            let new_divider = { time: Date.now() };
            console.log("new_divider:", new_divider);
            chat.divider.push(new_divider);
  
            let new_m = { type: 'divider', created_at: Date.now() };
            chat.messages.push(new_m);
            await chat.save({ new: true, validateModifiedOnly: true });
          }
        }
      }
      const { messages } = await GroupChat.findById(
        data.conversation_id
      ).select("messages");
      callback(messages);
    } catch (error) {
      console.log(error);
    }
  });
  socket.on("group_text_message", async (data) => {
    console.log("Received message:", data);

    const { message, conversation_id, from, to, type, reply } = data;

    if (message) {
      let new_message = {};
      if (type === "reply") {
        new_message = {
          to: to,
          from: from,
          type: type,
          created_at: Date.now(),
          text: message,
          reply: reply,
        };
      } else {
        new_message = {
          from: from,
          type: type,
          created_at: Date.now(),
          text: message,
        };
      }

      const chat = await GroupChat.findById(conversation_id);
      console.log(chat);
      chat.messages.push(new_message);
      const res = await chat.save({ new: true, validateModifiedOnly: true });

      const to_user_promises = to.map(async (id) => await User.findById(id));
      const to_users = await Promise.all(to_user_promises);

      console.log("therefore the promise is reached : " + to_users);

      to_users.forEach((user) => {
        io.to(user.socket_id).emit("group_new_message", {
          conversation_id,
          message: new_message,
        });
      });
      console.log("message sent to : ");
    }
  });
  socket.on("starmessage_Group", async (data) => {
    console.log("Received group message:", data);
    const { id } = data.Detail.message;
    console.log(id);
    const messageId = user_id;
    await GroupChat.updateOne(
      { "messages._id": id }, // match the document with the given message _id
      { $push: { "messages.$.star": messageId } } // push the message _id to the star array
    )
      .then(() => {
        console.log("Message _id pushed to star array");
      })
      .catch((err) => {
        console.error(err);
      });
  });
  socket.on("starmessage", async (data) => {
    console.log("Received message:", data);
    // const messageId = id;
    const { id } = data.Detail.message;
    //   // replace with the actual message _id
    console.log(id);
    const messageId = user_id;
    await OneToOneMessage.updateOne(
      { "messages._id": id }, // match the document with the given message _id
      { $push: { "messages.$.star": messageId } } // push the message _id to the star array
    )
      .then(() => {
        console.log("Message _id pushed to star array");
      })
      .catch((err) => {
        console.error(err);
      });
  });
  socket.on("deletemessage", async (data) => {
    console.log("Received message:", data);
    const { id, type, subtype, message, incoming, outgoing } = data;
    // you have to find the id of the message and delete it from the database
  });
  socket.on("Account_Block", async (data) => {
    console.log("This is the id of the data",data);
    const data_doc = await User.findById(data);
    const data_doc_1 = await User.findById(user_id); 
    console.log(data_doc);
    data_doc.blocked.push(user_id);
    data_doc_1.blocked.push(data);
    console.log(data_doc); 
    console.log(data_doc_1);
    await data_doc.save();
    await data_doc_1.save(); 
  });
  socket.on("Account_Unblock", async (data) => {
    console.log(data);
    const data_doc = await User.findById(data);
    console.log(data_doc);
    const userIdToRemove = user_id.toString();
    // Assuming you have a 'blockedUsers' array property in your data_doc object
    data_doc.blocked = data_doc.blocked.filter((userId) => userId.toString() !== userIdToRemove);
  
    console.log(data_doc);
    await data_doc.save();
  });
  socket.on("deleteMessage", async (data) => {
    console.log(data.Detail.message);
    // how to push the data so that prticular thing is deleted for the reason 
    
    
  })
  socket.on("end", async (data) => {
    if (data) {
      await User.findByIdAndUpdate(data, { status: "Offline" });
    }
    // broadcast to all conversation rooms of this user that this user is offline (disconnected)
    console.log("closing connection");
    socket.disconnect(0);
  });
});
process.on("unhandledRejection", (err) => {
  console.log(err);
  console.log("UNHANDLED REJECTION! Shutting down ...");
  server.close(() => {
    process.exit(1); //  Exit Code 1 indicates that a container shut down, either because of an application failure.
  });
});