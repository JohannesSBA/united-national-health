import { NextResponse } from "next/server";

import { ActivityCategory } from "@/generated/prisma/client";
import { requireGlobalAdminFromRequest } from "@/lib/require-global-admin";
import { db } from "@/lib/db";
import {
  decryptEmailBody,
  isEmailEncryptionEnabled,
} from "@/lib/email-encryption";
import { enforceRateLimit } from "@/lib/rate-limit";
import { recordAdminActivity } from "@/lib/services/global-admin/activity";

type Params = {
  params: Promise<{ logId: string }>;
};

export async function GET(request: Request, context: Params) {
  const session = await requireGlobalAdminFromRequest(request);
  try {
    await enforceRateLimit({
      key: `${session.user.id}:email-log-download`,
      limit: 20,
      windowSeconds: 60,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Too many download requests. Try again soon." },
      { status: 429 },
    );
  }
  if (!isEmailEncryptionEnabled()) {
    return NextResponse.json(
      { error: "EMAIL_LOG_SECRET is not configured" },
      { status: 500 },
    );
  }

  const { logId } = await context.params;
  if (!logId) {
    return NextResponse.json(
      { error: "Email log id required" },
      { status: 400 },
    );
  }

  const log = await db.emailLog.findUnique({
    where: { id: logId },
  });

  if (!log) {
    return NextResponse.json({ error: "Email log not found" }, { status: 404 });
  }

  let bodyHtml: string;
  try {
    bodyHtml = decryptEmailBody(log.bodyCiphertext);
  } catch (error) {
    return NextResponse.json(
      { error: "Unable to decrypt email body. Verify EMAIL_LOG_SECRET." },
      { status: 500 },
    );
  }

  const timestamp = new Date(log.createdAt).toISOString().replace(/[:.]/g, "-");
  const title = `Email to ${log.to} · ${new Date(log.createdAt).toLocaleString()}`;
  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${log.subject}</title>
  </head>
  <body style="font-family: system-ui, sans-serif; padding: 32px; background: #f8fafc;">
    <h1 style="margin-bottom: 8px;">${log.subject}</h1>
    <p style="color:#4b5563;font-size:14px;margin-bottom:24px;">${title}</p>
    <div>${bodyHtml}</div>
  </body>
</html>`;

  await recordAdminActivity(
    session.user.id,
    `Downloaded email log ${log.id}`,
    "Security & Compliance",
    ActivityCategory.SECURITY,
    { emailLogId: log.id },
  );

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html",
      "Content-Disposition": `attachment; filename="email-log-${timestamp}.html"`,
    },
  });
}
