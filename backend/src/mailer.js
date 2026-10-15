import nodemailer from 'nodemailer';

// Real email is used when SMTP_HOST is set in .env. Otherwise the code is printed in the
// server terminal, which is enough for local use and demos.
const transport = process.env.SMTP_HOST
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    })
  : null;

export async function sendResetCode(to, username, code) {
  if (transport && to) {
    await transport.sendMail({
      from: process.env.MAIL_FROM || process.env.SMTP_USER,
      to,
      subject: 'Your Timetable Desk password reset code',
      text: `Hello ${username},\n\nYour password reset code is ${code}. It expires in 15 minutes.\nIf you did not ask for this, you can ignore this email.`,
    });
    return 'email';
  }
  console.log(`[password reset] Code for "${username}": ${code} (valid for 15 minutes)`);
  return 'console';
}
