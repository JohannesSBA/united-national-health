import { db } from "@/lib/db";

export async function getAnalyticsSummary() {
  const [hospitalCounts, onboardingCounts, adminCounts, activityCounts] =
    await Promise.all([
      db.hospital.groupBy({
        by: ["status"],
        _count: true,
      }),
      db.onboardingAction.groupBy({
        by: ["status"],
        _count: true,
      }),
      db.user.count({
        where: {
          roles: {
            some: {
              role: {
                name: "HospitalAdmin",
              },
            },
          },
        },
      }),
      db.adminActivity.groupBy({
        by: ["category"],
        _count: true,
      }),
    ]);

  return {
    hospitalCounts,
    onboardingCounts,
    hospitalAdminCount: adminCounts,
    activityCounts,
  };
}

export async function exportGovernanceReport() {
  const [hospitals, onboardingActions] = await Promise.all([
    db.hospital.findMany({
      orderBy: { name: "asc" },
    }),
    db.onboardingAction.findMany({
      orderBy: { dueDate: "asc" },
      include: { hospital: true },
    }),
  ]);

  const header = [
    "Hospital Name",
    "Status",
    "Region",
    "Contact Email",
    "Contact Phone",
  ];
  const hospitalRows = hospitals.map((hospital) =>
    [
      hospital.name,
      hospital.status,
      hospital.region ?? "",
      hospital.contactEmail ?? "",
      hospital.contactPhone ?? "",
    ].join(","),
  );

  const onboardingHeader = [
    "Hospital",
    "Action",
    "Owner",
    "Due Date",
    "Status",
  ];
  const onboardingRows = onboardingActions.map((action) =>
    [
      action.hospital.name,
      action.action,
      action.owner,
      action.dueDate.toISOString(),
      action.status,
    ].join(","),
  );

  return [
    header.join(","),
    ...hospitalRows,
    "",
    onboardingHeader.join(","),
    ...onboardingRows,
  ].join("\n");
}
