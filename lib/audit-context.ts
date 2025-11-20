export type AuditContext = {
  ipAddress?: string | null;
  location?: string | null;
  userAgent?: string | null;
};

let geoip: typeof import("geoip-lite") | null = null;

function getGeoIp() {
  if (geoip) return geoip;
  try {
    geoip = require("geoip-lite");
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[audit] geoip-lite unavailable – location data will be omitted.",
      );
    }
    geoip = null;
  }
  return geoip;
}

function extractIpAddress(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? null;
  }
  const realIp = headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }
  return null;
}

export function buildAuditContext(headers: Headers): AuditContext {
  const ipAddress = extractIpAddress(headers);
  const userAgent = headers.get("user-agent");
  const geo = ipAddress ? getGeoIp()?.lookup(ipAddress) : null;
  const location = geo
    ? [geo.city, geo.region, geo.country].filter(Boolean).join(", ")
    : null;

  return {
    ipAddress,
    userAgent,
    location,
  };
}

export function mergeAuditMetadata(
  metadata: unknown,
  context?: AuditContext,
): Record<string, unknown> | undefined {
  const base =
    metadata && typeof metadata === "object"
      ? (metadata as Record<string, unknown>)
      : undefined;
  const contextEntries =
    context && (context.ipAddress || context.location || context.userAgent)
      ? {
          ipAddress: context.ipAddress ?? undefined,
          location: context.location ?? undefined,
          userAgent: context.userAgent ?? undefined,
        }
      : undefined;

  if (!base && !contextEntries) {
    return undefined;
  }

  return {
    ...(base ?? {}),
    ...(contextEntries ?? {}),
  };
}
