// // const sgMail = require("@sendgrid/mail");

// // // console.log(process.env.SG_KEY);

// // // sgMail.setApiKey(process.env.SG_KEY);

// // const sendSGMail = async ({to,sender,subject,html,attachments,text,}) => {
// //   try {
// //     const from = "rushabhramani16@gmail.com";

// //     const msg = {
// //       to: to, // Change to your recipient
// //       from: from, // Change to your verified sender
// //       subject: subject,
// //       html: html,
// //       // text: text,
// //       attachments,
// //     };

// //     console.log(msg);
    
// //     return sgMail.send(msg);
// //   } catch (error) {
// //     console.log(error);
// //   }
// // };


// const nodemailer = require("nodemailer");

// const sendSGMail = async ({ to, sender, subject, html, attachments, text }) => {
//   try {
//     let testAccount = await nodemailer.createTestAccount();
//     const transporter = nodemailer.createTransport({
//       host: "smtp.forwardemail.net",
//       port: 465,
//       secure: true,
//       auth: {
//         // TODO: replace `user` and `pass` values from <https://forwardemail.net>
//             user:testAccount.user,
//             pass:testAccount.pass,
//       },  
//     });
//     let message = {
//       from: '"Fred Foo 👻" <foo@example.com>', // sender address
//       to: "bar@example.com, baz@example.com", // list of receivers
//       subject: subject, // Subject line
//       text: text, // plain text body
//       html: html , // html body
//     }
//     transporter.sendMail(message).then((info) => {
//       return res.status(200).json({
//         status: "success", message: "OTP Sent Successfully! Please check your email",

//       });
//     }
//     ).catch((error) => console.log(error.response.body.errors));

//   }
//   catch (error) {
    
//   }
// }
// exports.sendEmail = async (args) => {
//   if (!process.env.NODE_ENV === "development") {
//     return Promise.resolve();
//   } else {
//     return sendSGMail(args);
//   }
// };