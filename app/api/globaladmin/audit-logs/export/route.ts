import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { requireGlobalAdminFromRequest } from "@/lib/require-global-admin";

export async function GET(request: Request) {
  await requireGlobalAdminFromRequest(request);

  const records = await db.adminActivity.findMany({
    orderBy: { createdAt: "desc" },
    take: 1000,
  });

  const header = ["timestamp", "actor", "action", "scope", "category"];
  const rows = records.map((activity) =>
    [
      activity.createdAt.toISOString(),
      activity.actor,
      activity.action.replace(/"/g, '""'),
      activity.scope,
      activity.category,
    ].join(","),
  );

  const csv = [header.join(","), ...rows].join("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition":
        'attachment; filename="administrative-activity.csv"',
    },
  });
}
