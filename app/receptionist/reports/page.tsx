import {
  ReceptionistHeader,
  receptionistNavItems,
} from "@/app/components/receptionist/receptionist-header";
import { WorkspaceNav } from "@/app/components/receptionist/workspace-nav";
import { Badge } from "@/app/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";
import { User } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { requireHospitalContext } from "@/lib/receptionist/guards";

type StatusCount = {
  status: string;
  count: number;
};

export default async function ReceptionistReportsPage() {
  const { session, hospitalId, hospitalName } = await requireHospitalContext();

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);

  const anyDb = db as any;

  const [statusCounts, upcomingToday, recentCheckins] = await Promise.all([
    anyDb.appointment.groupBy({
      by: ["status"],
      where: {
        hospitalId,
        startsAt: {
          gte: startOfDay,
          lt: endOfDay,
        },
      },
      _count: true,
    }),
    anyDb.appointment.findMany({
      where: {
        hospitalId,
        startsAt: { gte: startOfDay, lt: endOfDay },
      },
      orderBy: { startsAt: "asc" },
      include: {
        doctor: { select: { name: true, email: true } },
      },
      take: 25,
    }),
    anyDb.checkInEvent.findMany({
      where: {
        createdAt: { gte: startOfDay, lt: endOfDay },
        appointment: { hospitalId },
      },
      include: {
        appointment: {
          select: {
            patientDisplayName: true,
            patientExternalId: true,
            startsAt: true,
            doctor: { select: { name: true, email: true } },
          },
        },
        receptionist: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 25,
    }),
  ]);

  const statusMap: Record<string, number> = {};
  (statusCounts as StatusCount[]).forEach((row) => {
    statusMap[row.status] = Number((row as any)._count || row.count || 0);
  });

  const totalToday = upcomingToday.length
    ? upcomingToday.length
    : Object.values(statusMap).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6 p-6">
      <ReceptionistHeader user={session.user as User} />

      <WorkspaceNav
        badge={<Badge variant="outline">Reports overview</Badge>}
        items={receptionistNavItems as any}
      />

      <Card>
        <CardHeader>
          <CardTitle>Daily metrics</CardTitle>
          <CardDescription>
            {hospitalName || "Hospital"} • {startOfDay.toLocaleDateString()}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-4">
          <Stat label="Total appointments" value={totalToday} />
          <Stat label="Scheduled" value={statusMap.SCHEDULED ?? 0} />
          <Stat label="Checked in" value={statusMap.CHECKED_IN ?? 0} />
          <Stat label="Completed" value={statusMap.COMPLETED ?? 0} />
          <Stat label="Cancelled" value={statusMap.CANCELLED ?? 0} />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Today&apos;s schedule</CardTitle>
            <CardDescription>Ordered by start time</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {upcomingToday.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center text-sm text-muted-foreground"
                    >
                      No appointments today.
                    </TableCell>
                  </TableRow>
                ) : (
                  upcomingToday.map((appt: any) => (
                    <TableRow key={appt.id}>
                      <TableCell>
                        <div className="font-semibold">
                          {appt.patientDisplayName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {appt.patientExternalId}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(appt.startsAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </TableCell>
                      <TableCell className="text-sm">
                        {appt.doctor?.name || appt.doctor?.email || "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        <Badge
                          variant={
                            appt.status === "CANCELLED" ? "warning" : "outline"
                          }
                        >
                          {appt.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent check-ins</CardTitle>
            <CardDescription>Latest desk activity</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Checked in at</TableHead>
                  <TableHead>Desk</TableHead>
                  <TableHead>Receptionist</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentCheckins.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center text-sm text-muted-foreground"
                    >
                      No check-ins today.
                    </TableCell>
                  </TableRow>
                ) : (
                  recentCheckins.map((check: any) => (
                    <TableRow key={check.id}>
                      <TableCell>
                        <div className="font-semibold">
                          {check.appointment?.patientDisplayName || "Unknown"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {check.appointment?.patientExternalId}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(
                          check.at ?? check.createdAt,
                        ).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </TableCell>
                      <TableCell className="text-sm">
                        {check.desk || "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {check.receptionist?.name ||
                          check.receptionist?.email ||
                          "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border/70 bg-muted/30 p-3">
      <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}
