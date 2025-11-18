import nodemailer from "nodemailer";
import { db } from "@/lib/db";
import {
  buildAdminWelcomeEmail,
  buildHospitalStatusEmail,
} from "./email-templates";
import { encryptEmailBody } from "@/lib/email-encryption";
import { raiseSecurityAlert } from "@/lib/services/global-admin/activity";

type EmailPayload = {
  to: string;
  subject: string;
  text?: string;
  html: string;
  metadata?: Record<string, unknown>;
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

function fallbackText(html: string) {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function alertEmailFailure(reason: string, payload: EmailPayload) {
  console.error(`[email] ${reason}`, payload);
  try {
    await raiseSecurityAlert({
      type: "EMAIL_DELIVERY_FAILURE",
      severity: "HIGH",
      description: `${reason} (to: ${payload.to}, subject: ${payload.subject})`,
    });
  } catch (error) {
    console.error("[email] Failed to raise security alert", error);
  }
}

async function logEmail(payload: EmailPayload) {
  try {
    const delegate = (db as typeof db & { emailLog?: typeof db.emailLog })
      .emailLog;
    if (!delegate?.create) {
      await alertEmailFailure(
        "EmailLog model unavailable. Skipping email log persistence.",
        payload,
      );
      return null;
    }
    const ciphertext = encryptEmailBody(payload.html);
    if (!ciphertext) {
      await alertEmailFailure(
        "Email log encryption is not configured",
        payload,
      );
      return null;
    }
    const record = await delegate.create({
      data: {
        to: payload.to,
        subject: payload.subject,
        bodyCiphertext: ciphertext,
        metadata: {
          ...(payload.metadata ?? {}),
          encrypted: true,
        },
      },
    });
    return record.id;
  } catch (error) {
    console.error("[email] Failed to log email", error);
    return null;
  }
}

export async function sendSystemEmail(payload: EmailPayload) {
  const text = payload.text ?? fallbackText(payload.html);
  const logId = await logEmail(payload);
  const mailer = getTransporter();

  if (!mailer) {
    await alertEmailFailure("SMTP configuration missing", payload);
    return logId;
  }

  try {
    await mailer.sendMail({
      from:
        process.env.SMTP_FROM ??
        `United National Health <${process.env.SMTP_USER}>`,
      to: payload.to,
      subject: payload.subject,
      text,
      html: payload.html,
    });
  } catch (error) {
    await alertEmailFailure("SMTP delivery failed", payload);
    throw error;
  }

  return logId;
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
  const template = buildAdminWelcomeEmail({
    name,
    email: to,
    temporaryPassword,
  });
  return sendSystemEmail({
    to,
    subject: template.subject,
    html: template.html,
    text: template.text,
    metadata: {
      template: "admin_credentials",
      recipientName: name,
    },
  });
}

export async function sendHospitalStatusEmail({
  to,
  hospitalName,
  status,
  reason,
}: {
  to: string;
  hospitalName: string;
  status: string;
  reason: string;
}) {
  const template = buildHospitalStatusEmail({ hospitalName, status, reason });
  return sendSystemEmail({
    to,
    subject: template.subject,
    html: template.html,
    text: template.text,
    metadata: {
      template: "hospital_status",
      hospitalName,
      status,
      reason,
    },
  });
}
