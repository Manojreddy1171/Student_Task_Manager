const nodemailer = require('nodemailer');

const fromAddress = process.env.EMAIL_FROM || 'TaskAcademy <no-reply@taskacademy.local>';

let transporter = null;
if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
} else {
  console.warn('SMTP not configured. Emails will be logged instead of sent.');
}

async function sendEmail({ to, subject, text, html }) {
  const mailOptions = {
    from: fromAddress,
    to,
    subject,
    text,
    html
  };

  if (!transporter) {
    console.log('[DEV EMAIL]', JSON.stringify(mailOptions, null, 2));
    return { success: true, message: 'Email logged to console in development mode.' };
  }

  const info = await transporter.sendMail(mailOptions);
  return { success: true, info };
}

module.exports = { sendEmail };
