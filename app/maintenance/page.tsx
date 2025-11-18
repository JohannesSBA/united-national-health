import Link from "next/link";

import { getMaintenanceSetting } from "@/lib/services/global-admin/system";

export default async function MaintenancePage() {
  const maintenance = await getMaintenanceSetting();

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="rounded-3xl border border-border/70 bg-card/95 px-8 py-12 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
          Scheduled Maintenance
        </p>
        <h1 className="mt-3 text-3xl font-semibold">
          United National Health console is temporarily unavailable
        </h1>
        <p className="mt-4 text-sm text-muted-foreground">
          {maintenance.reason?.trim()
            ? maintenance.reason
            : "Global Administrators are performing platform upgrades. Please check back soon."}
        </p>
        <div className="mt-6 text-sm text-muted-foreground">
          Last updated just now. If you have urgent governance needs, contact
          the Global Admin team.
        </div>
        <div className="mt-8">
          <Link
            href="mailto:operations@unh.gov"
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Reach platform operations
          </Link>
        </div>
      </div>
    </div>
  );
}
