import nodemailer from "nodemailer";

type EmailPayload = {
  to: string;
  subject: string;
  text: string;
};

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (
    !process.env.SMTP_HOST ||
    !process.env.SMTP_PORT ||
    !process.env.SMTP_USER ||
    !process.env.SMTP_PASS
  ) {
    return null;
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure:
        process.env.SMTP_SECURE === "true" ||
        Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  return transporter;
}

export async function sendSystemEmail(payload: EmailPayload) {
  const mailer = getTransporter();

  if (!mailer) {
    console.warn("[email] SMTP configuration missing. Email content:", payload);
    return;
  }

  await mailer.sendMail({
    from:
      process.env.SMTP_FROM ??
      `United National Health <${process.env.SMTP_USER}>`,
    to: payload.to,
    subject: payload.subject,
    text: payload.text,
  });
}

export async function sendTemporaryPasswordEmail({
  to,
  name,
  temporaryPassword,
}: {
  to: string;
  name: string;
  temporaryPassword: string;
}) {
  const text = [
    `Hello ${name || "Team"},`,
    "",
    "A Global Admin reset your hospital administrator credentials.",
    `Temporary password: ${temporaryPassword}`,
    "",
    "Sign in immediately and update your password. If you did not request this, alert platform security.",
    "",
    "– United National Health Platform",
  ].join("\n");

  await sendSystemEmail({
    to,
    subject: "Hospital Admin Credentials Reset",
    text,
  });
}
