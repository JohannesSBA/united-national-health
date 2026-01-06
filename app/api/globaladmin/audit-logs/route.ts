import { NextResponse } from "next/server";

import { requireGlobalAdminFromRequest } from "@/lib/require-global-admin";
import { db } from "@/lib/db";

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

export async function GET(request: Request) {
  await requireGlobalAdminFromRequest(request);
  const url = new URL(request.url);
  const pageParam = Number(url.searchParams.get("page"));
  const pageSizeParam = Number(url.searchParams.get("pageSize"));
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
  const pageSizeRaw =
    Number.isFinite(pageSizeParam) && pageSizeParam > 0
      ? pageSizeParam
      : DEFAULT_PAGE_SIZE;
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(5, pageSizeRaw));
  const skip = (page - 1) * pageSize;

  const [records, total] = await Promise.all([
    db.adminActivity.findMany({
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    db.adminActivity.count(),
  ]);

  const data = records.map((activity) => ({
    id: activity.id,
    actor: activity.actor,
    action: activity.action,
    scope: activity.scope,
    category: activity.category,
    timestamp: activity.createdAt.toISOString(),
    metadata: activity.metadata,
  }));

  return NextResponse.json({
    data,
    meta: {
      page,
      pageSize,
      total,
    },
  });
}
