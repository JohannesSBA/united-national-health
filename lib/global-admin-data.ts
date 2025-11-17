import { db } from "@/lib/db";
import {
  OnboardingPriority,
  SystemStatusState,
} from "@/generated/prisma/client";

export type SystemStatusSummary = {
  overallStatus: "operational" | "degraded" | "maintenance";
  uptimePercent: number;
  lastIncidentAt: string | null;
  deploymentVersion: string;
};

export type PendingOnboardingAction = {
  id: string;
  hospitalName: string;
  action: string;
  owner: string;
  dueDate: string;
  priority: "low" | "medium" | "high";
};

export type AdministrativeActivity = {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  scope: string;
};

export type GlobalAdminDashboardData = {
  totalHospitals: number;
  totalHospitalAdmins: number;
  systemStatus: SystemStatusSummary;
  pendingActions: PendingOnboardingAction[];
  recentActivity: AdministrativeActivity[];
};

const DEFAULT_DEPLOYMENT_VERSION =
  process.env.NEXT_PUBLIC_DEPLOYMENT_VERSION ?? "2025.03.0";

function mapStatus(
  state: SystemStatusState,
): SystemStatusSummary["overallStatus"] {
  switch (state) {
    case "DEGRADED":
      return "degraded";
    case "MAINTENANCE":
      return "maintenance";
    default:
      return "operational";
  }
}

function mapPriority(
  priority: OnboardingPriority,
): PendingOnboardingAction["priority"] {
  switch (priority) {
    case "HIGH":
      return "high";
    case "MEDIUM":
      return "medium";
    default:
      return "low";
  }
}

export async function fetchHospitalAggregates() {
  const [totalHospitals, totalHospitalAdmins] = await Promise.all([
    db.hospital.count(),
    db.userRole.count({
      where: {
        role: {
          name: "HospitalAdmin",
        },
      },
    }),
  ]);

  return { totalHospitals, totalHospitalAdmins };
}

export async function fetchSystemStatusSummary(): Promise<SystemStatusSummary> {
  const latest = await db.systemStatus.findFirst({
    orderBy: { createdAt: "desc" },
  });

  if (!latest) {
    return {
      overallStatus: "operational",
      uptimePercent: 100,
      lastIncidentAt: null,
      deploymentVersion: DEFAULT_DEPLOYMENT_VERSION,
    };
  }

  return {
    overallStatus: mapStatus(latest.overallStatus),
    uptimePercent: latest.uptimePercent,
    lastIncidentAt: latest.lastIncidentAt
      ? latest.lastIncidentAt.toISOString()
      : null,
    deploymentVersion: latest.deploymentVersion,
  };
}

export async function fetchPendingOnboardingActions(): Promise<
  PendingOnboardingAction[]
> {
  const actions = await db.onboardingAction.findMany({
    where: {
      status: {
        notIn: ["COMPLETED"],
      },
    },
    include: {
      hospital: true,
    },
    orderBy: {
      dueDate: "asc",
    },
  });

  return actions.map((action) => ({
    id: action.id,
    hospitalName: action.hospital.name,
    action: action.action,
    owner: action.owner,
    dueDate: action.dueDate.toISOString(),
    priority: mapPriority(action.priority),
  }));
}

export async function fetchAdministrativeActivity(): Promise<
  AdministrativeActivity[]
> {
  const events = await db.adminActivity.findMany({
    orderBy: {
      createdAt: "desc",
    },
    take: 10,
  });

  return events.map((event) => ({
    id: event.id,
    timestamp: event.createdAt.toISOString(),
    actor: event.actor,
    action: event.action,
    scope: event.scope,
  }));
}

export async function getGlobalAdminDashboardData(): Promise<GlobalAdminDashboardData> {
  const [aggregates, systemStatus, pendingActions, recentActivity] =
    await Promise.all([
      fetchHospitalAggregates(),
      fetchSystemStatusSummary(),
      fetchPendingOnboardingActions(),
      fetchAdministrativeActivity(),
    ]);

  return {
    totalHospitals: aggregates.totalHospitals,
    totalHospitalAdmins: aggregates.totalHospitalAdmins,
    systemStatus,
    pendingActions,
    recentActivity,
  };
}
