import { NextResponse } from "next/server";
import { ActivityCategory, Prisma } from "@/generated/prisma/client";
import { requireGlobalAdminFromRequest } from "@/lib/require-global-admin";
import { db } from "@/lib/db";
import {
  decryptEmailBody,
  isEmailEncryptionEnabled,
} from "@/lib/email-encryption";
import { enforceRateLimit } from "@/lib/rate-limit";
import { recordAdminActivity } from "@/lib/services/global-admin/activity";
import { buildAuditContext } from "@/lib/audit-context";

const DECRYPTION_ERROR_HTML =
  '<p style="color:#dc2626;">Unable to decrypt email body. Verify EMAIL_LOG_SECRET.</p>';

type RenderableEmailLog = {
  createdAt: Date;
  to: string;
  subject: string;
  body: string;
};

function renderLogHtml(
  logs: RenderableEmailLog[],
  meta: {
    page: number;
    limit: number;
    recipient?: string | null;
    start?: string | null;
    end?: string | null;
  },
) {
  const metaSummary = [
    `Page ${meta.page}`,
    `${meta.limit} per page`,
    meta.recipient ? `Recipient: ${meta.recipient}` : null,
    meta.start ? `Start: ${meta.start}` : null,
    meta.end ? `End: ${meta.end}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const rows = logs
    .map(
      (log) => `
      <section style="margin-bottom:32px;padding-bottom:24px;border-bottom:1px solid #e5e7eb;">
        <p style="font-size:12px;color:#6b7280;">${log.createdAt.toISOString()}</p>
        <h2 style="margin:4px 0;font-size:18px;">${log.subject}</h2>
        <p style="margin:0 0 8px 0;font-size:14px;color:#374151;"><strong>To:</strong> ${log.to}</p>
        <div>${log.body}</div>
      </section>
    `,
    )
    .join("\n");
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Email Logs</title>
  </head>
  <body style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 32px; background: #f9fafb; color: #0f172a;">
    <h1 style="margin-bottom: 16px;">United National Health · Email Archive</h1>
    <p style="font-size:13px;color:#4b5563;margin-bottom:24px;">${metaSummary}</p>
    ${rows || "<p>No email activity recorded.</p>"}
  </body>
</html>`;
}

export async function GET(request: Request) {
  const session = await requireGlobalAdminFromRequest(request);
  try {
    await enforceRateLimit({
      key: `${session.user.id}:email-log-export`,
      limit: 10,
      windowSeconds: 60,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Too many export requests. Try again soon." },
      { status: 429 },
    );
  }

  if (!isEmailEncryptionEnabled()) {
    return NextResponse.json(
      {
        error:
          "EMAIL_LOG_SECRET is not configured. Email logs cannot be decrypted.",
      },
      { status: 500 },
    );
  }

  const url = new URL(request.url);
  const params = url.searchParams;
  const limit = Math.min(Math.max(Number(params.get("limit")) || 250, 1), 1000);
  const page = Math.max(Number(params.get("page")) || 1, 1);
  const skip = (page - 1) * limit;
  const recipient = params.get("recipient");
  const startParam = params.get("start");
  const endParam = params.get("end");

  const where: Prisma.EmailLogWhereInput = {};
  if (recipient) {
    where.to = {
      equals: recipient,
      mode: "insensitive",
    };
  }
  if (!recipient && !startParam && !endParam) {
    return NextResponse.json(
      {
        error:
          "Provide at least a recipient or start/end date to download email logs.",
      },
      { status: 400 },
    );
  }

  if (startParam || endParam) {
    const createdAt: Prisma.DateTimeFilter = {};
    if (startParam) {
      const startDate = new Date(startParam);
      if (!Number.isNaN(startDate.getTime())) {
        createdAt.gte = startDate;
      }
    }
    if (endParam) {
      const endDate = new Date(endParam);
      if (!Number.isNaN(endDate.getTime())) {
        createdAt.lte = endDate;
      }
    }
    if (Object.keys(createdAt).length > 0) {
      where.createdAt = createdAt;
    }
  }

  const logs = await db.emailLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip,
    take: limit,
  });

  const decryptedLogs: RenderableEmailLog[] = logs.map((log) => {
    try {
      return {
        createdAt: log.createdAt,
        to: log.to,
        subject: log.subject,
        body: decryptEmailBody(log.bodyCiphertext),
      };
    } catch (error) {
      return {
        createdAt: log.createdAt,
        to: log.to,
        subject: log.subject,
        body: DECRYPTION_ERROR_HTML,
      };
    }
  });
  const filterMeta = {
    page,
    limit,
    recipient,
    start: startParam,
    end: endParam,
  };

  const html = renderLogHtml(decryptedLogs, filterMeta);

  const auditContext = buildAuditContext(request.headers);

  await recordAdminActivity(
    session.user.id,
    "Exported email logs",
    "Security & Compliance",
    ActivityCategory.SECURITY,
    { filters: filterMeta },
    auditContext,
  );

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html",
      "Content-Disposition": `attachment; filename="email-logs-${timestamp}.html"`,
    },
  });
}
