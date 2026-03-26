import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
  host: "mail.vedikastrologer.com", // IMPORTANT
  port: 465, // Try 465 first
  secure: true, // true for 465
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

transporter.verify((error, success) => {
  if (error) {
    console.log("❌ SMTP Error:", error);
  } else {
    console.log("✅ SMTP Server is ready");
  }
});

export const sendMail = async (to, subject, html, cc = null) => {
  return transporter.sendMail({
    from: `"Vedik Astrologer" <${process.env.EMAIL_USER}>`,
    to,
    cc,
    subject,
    html,
  });
};
