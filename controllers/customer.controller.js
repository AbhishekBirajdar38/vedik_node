import { sendMail } from "../config/mailer.js";
exports.createCustomer = async (req, res) => {
  try {
    const { name, email, phone, message } = req.body;

    // 👉 Save customer in DB here (if required)

    // 📩 1️⃣ Mail to Admin
    await sendMail(
      "mrunal@vedikastrologer.com",
      "New Customer Inquiry",
      `
        <h2>New Customer Form Submission</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Phone:</strong> ${phone}</p>
        <p><strong>Message:</strong> ${message}</p>
      `,
    );

    // 📩 2️⃣ Confirmation Mail to Customer
    await sendMail(
      email,
      "Thank You for Contacting Us",
      `
        <h2>Hello ${name},</h2>
        <p>Thank you for contacting us. Our team will get back to you shortly.</p>
        <br/>
        <p>Regards,<br/>Vedik Team</p>
      `,
    );

    res.status(200).json({
      success: true,
      message: "Form submitted and emails sent successfully",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Error sending email",
    });
  }
};
