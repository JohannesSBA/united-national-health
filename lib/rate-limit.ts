import { db } from "@/lib/db";

const DEFAULT_WINDOW_SECONDS = 60;

export async function enforceRateLimit({
  key,
  limit,
  windowSeconds = DEFAULT_WINDOW_SECONDS,
}: {
  key: string;
  limit: number;
  windowSeconds?: number;
}) {
  const now = Date.now() / 1000;
  const existing = await db.rateLimit.findUnique({
    where: { key },
  });

  if (!existing || now - existing.lastRequest > windowSeconds) {
    await db.rateLimit.upsert({
      where: { key },
      update: {
        count: 1,
        lastRequest: now,
      },
      create: {
        key,
        count: 1,
        lastRequest: now,
      },
    });
    return;
  }

  if (existing.count >= limit) {
    throw new Error("Rate limit exceeded");
  }

  await db.rateLimit.update({
    where: { key },
    data: {
      count: existing.count + 1,
      lastRequest: now,
    },
  });
}
