/**
 * @fileoverview Email utility module for sending emails via SendGrid API.
 * Provides a simple interface for sending emails using SendGrid (free tier: 100 emails/day).
 * No domain required, works perfectly with academic projects.
 * @author Tudu Development Team
 * @version 4.0.0
 * @requires @sendgrid/mail
 */

import sgMail from "@sendgrid/mail";

/**
 * Sends an email using SendGrid API.
 * Works perfectly with Render free tier (no SMTP port restrictions).
 * Free tier: 100 emails/day, no domain verification needed.
 *
 * @async
 * @function sendEmail
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject line
 * @param {string} text - Email content in plain text format
 * @returns {Promise<void>} Resolves when email is sent successfully
 * @throws {Error} Throws error if email sending fails
 *
 * @example
 * // Send a simple email
 * await sendEmail(
 *   'user@example.com',
 *   'Welcome to Maraton',
 *   'Thank you for signing up!'
 * );
 *
 * @example
 * // Send password reset email
 * const resetUrl = 'https://app.com/reset/token123';
 * await sendEmail(
 *   'user@example.com',
 *   'Password Reset',
 *   `Click here to reset your password: ${resetUrl}`
 * );
 *
 * @requires process.env.SENDGRID_API_KEY - SendGrid API key (get from https://sendgrid.com)
 * @requires process.env.SENDGRID_FROM_EMAIL - Verified sender email in SendGrid
 */
async function sendEmail(
  to: string,
  subject: string,
  text: string
): Promise<void> {
  try {
    /**
     * Check if API key is configured
     */
    if (!process.env.SENDGRID_API_KEY) {
      throw new Error("SENDGRID_API_KEY no está configurada");
    }

    if (!process.env.SENDGRID_FROM_EMAIL) {
      throw new Error("SENDGRID_FROM_EMAIL no está configurada");
    }

    /**
     * Configure SendGrid with API key
     */
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    /**
     * Prepare email message
     */
    const msg = {
      to: to,
      from: process.env.SENDGRID_FROM_EMAIL,
      subject: subject,
      text: text,
      html: `<p>${text.replace(/\n/g, "<br>")}</p>`,
    };

    /**
     * Send email via SendGrid API
     */
    await sgMail.send(msg);

    console.log(`📧 Email enviado a ${to}`);
  } catch (error: any) {
    console.error("❌ Error enviando email:", error);
    if (error.response) {
      console.error("SendGrid error:", error.response.body);
    }
    throw new Error("No se pudo enviar el correo");
  }
}

/**
 * Export the sendEmail function as the main module export.
 * @module sendEmail
 * @type {Function}
 */
export default sendEmail;
