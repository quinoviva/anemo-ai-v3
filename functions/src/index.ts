
import * as functions from "firebase-functions";
import * as nodemailer from "nodemailer";
import { UserRecord } from 'firebase-admin/auth'; // Import UserRecord for typing

// We'll use environment variables to configure the email transport.
// This is more secure than hardcoding credentials.
// For v1 functions, configuration is accessed via functions.config()
const gmailConfig = functions.config().gmail as any; // Cast to any to bypass type errors
const gmailEmail = gmailConfig?.email;
const gmailPassword = gmailConfig?.password;

// Create a Nodemailer transporter using Gmail.
// For production, it's highly recommended to use a transactional email service
// like SendGrid, Mailgun, or Resend instead of a personal Gmail account.
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: gmailEmail,
    pass: gmailPassword,
  },
});

/**
 * Sends a welcome email to new users.
 */
export const sendWelcomeEmail = functions.auth.user().onCreate(async (user: UserRecord) => {
  const { email, displayName } = user;

  if (!email) {
    functions.logger.log("Cannot send welcome email to user without an email address.");
    return;
  }

  // Ensure config values are present before trying to send email
  if (!gmailEmail || !gmailPassword) {
    functions.logger.error("Gmail email or password not configured. Cannot send welcome email.");
    return;
  }

  const mailOptions = {
    from: `"ANEMO" <${gmailEmail}>`,
    to: email,
    subject: "Welcome to ANEMO! ❤️",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h1 style="color: #d32f2f;">Welcome to ANEMO, ${displayName || ""}!</h1>
        <p>
          We're thrilled to have you join our community. ANEMO is here to help you 
          monitor and understand your health better.
        </p>
        <p>
          You can now log in and start exploring the features, including our 
          image analysis tools, health history tracking, and more.
        </p>
        <p>
          If you have any questions, feel free to reply to this email.
        </p>
        <br>
        <p>Best regards,</p>
        <p><strong>The ANEMO Team</strong></p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    functions.logger.log("Welcome email sent successfully to:", email);
  } catch (error) {
    functions.logger.error("Error sending welcome email:", error);
  }
});
