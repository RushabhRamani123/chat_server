const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config({ path: "./env" });
process.on("uncaughtException", (err) => {
  console.log(err);
  console.log("UNCAUGHT Exception! Shutting down ...");
  process.exit(1); // Exit Code 1 indicates that a container shut down, either because of an application failure.
});
const app = require("./app");
const http = require("http");
const server = http.createServer(app);

// const DB = process.env.DATABASE.replace(
//     "<PASSWORD>",
//     process.env.DATABASE_PASSWORD
//   );
//mongodb+srv://rushabhram16:CM0tYIctDRv1DrYd@cluster1.usgm9re.mongodb.net/?retryWrites=true&w=majority
mongoose.connect
  (
    `mongodb+srv://rushabhram16:chat_server_project@cluster1.usgm9re.mongodb.net/?retryWrites=true&w=majority`, {}).then(() => { console.log("Database connected"); }).catch((err) => { console.log(err); });

const port = process.env.PORT || 8000;

server.listen(port, () => {
  console.log(`App running on port ${port} ...`);
});

// process.on("unhandledRejection", (err) => {
//   console.log(err);
//   console.log("UNHANDLED REJECTION! Shutting down ...");
//   server.close(() => {
//     process.exit(1); //  Exit Code 1 indicates that a container shut down, either because of an application failure.
//   });
// });