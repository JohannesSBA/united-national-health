import { getMaintenanceSetting } from "@/lib/services/global-admin/system";

export async function MaintenanceBanner() {
  const maintenance = await getMaintenanceSetting();

  if (!maintenance.enabled) {
    return null;
  }

  return (
    <div className="w-full bg-amber-100 p-3 text-center text-sm text-amber-900">
      <p className="font-semibold">Maintenance mode enabled.</p>
      <p className="text-xs">
        {maintenance.reason ||
          "Access is limited to Global Administrators while maintenance is in progress."}
      </p>
    </div>
  );
}
