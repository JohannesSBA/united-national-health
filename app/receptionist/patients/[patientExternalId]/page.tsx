import { notFound } from "next/navigation";

import { AppointmentStatus, User } from "@/generated/prisma/client";
import { Badge } from "@/app/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/components/ui/table";
import { ReceptionistHeader } from "@/app/components/receptionist/receptionist-header";
import { requireHospitalContext } from "@/lib/receptionist/guards";
import { getPatientDetail } from "@/lib/receptionist/patients";

type PageProps = {
  params: Promise<{ patientExternalId: string }>;
};

const statusLabels: Record<AppointmentStatus, string> = {
  SCHEDULED: "Scheduled",
  CHECKED_IN: "Checked in",
  CANCELLED: "Cancelled",
  COMPLETED: "Completed",
};

function formatDate(value?: Date | string | null) {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString();
}

function safeNotes(value: unknown): Record<string, any> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, any>;
  }
  return {};
}

export default async function PatientDetailPage({ params }: PageProps) {
  const { hospitalId, session } = await requireHospitalContext();
  const { patientExternalId } = await params;

  const detail = await getPatientDetail(hospitalId, patientExternalId);
  if (!detail) {
    notFound();
  }

  const latestNotes = safeNotes(detail.latest?.notes);
  const infoFields = ["phone", "email", "dob", "sex", "address", "insurance", "emergencyContact"] as const;

  return (
    <div className="space-y-6 p-6">
      <ReceptionistHeader user={session.user as User} />

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold">
              {detail.latest?.patientDisplayName ?? "Unknown patient"}
            </CardTitle>
            <div className="text-sm text-muted-foreground">
              External ID: {patientExternalId}
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <Stat title="Total visits" value={detail.totals.total} />
            <Stat title="Last visit" value={formatDate(detail.latest?.startsAt)} />
            <Stat title="Next visit" value={formatDate(detail.next?.startsAt)} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Status summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {Object.values(AppointmentStatus).map((s) => (
              <div key={s} className="flex items-center justify-between">
                <span>{statusLabels[s]}</span>
                <span className="font-semibold">{detail.statusCounts[s] ?? 0}</span>
              </div>
            ))}
            <div className="flex items-center justify-between border-t border-border/60 pt-2">
              <span>Avg check-in lead (mins)</span>
              <span className="font-semibold">
                {detail.avgCheckInLeadMinutes ?? "—"}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Patient details (from notes)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {infoFields.some((key) => latestNotes[key]) ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {infoFields.map((key) =>
                latestNotes[key] ? (
                  <div key={key} className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                    <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      {key}
                    </div>
                    <div className="text-sm font-semibold">{String(latestNotes[key])}</div>
                  </div>
                ) : null,
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No additional details on file.</p>
          )}
          {detail.latest?.notes ? (
            <details className="rounded-lg border border-border/70 bg-card/90 p-3 text-sm">
              <summary className="cursor-pointer font-semibold">Raw notes (latest appointment)</summary>
              <pre className="mt-2 overflow-auto rounded bg-muted/50 p-2 text-xs">
                {JSON.stringify(detail.latest.notes, null, 2)}
              </pre>
            </details>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming appointments</CardTitle>
        </CardHeader>
        <CardContent>
          <AppointmentsTable appointments={detail.upcoming} emptyLabel="No upcoming appointments." />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Past appointments</CardTitle>
        </CardHeader>
        <CardContent>
          <AppointmentsTable appointments={detail.past} emptyLabel="No past appointments yet." />
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border/70 bg-muted/30 p-3">
      <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{title}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}

function AppointmentsTable({
  appointments,
  emptyLabel,
}: {
  appointments: any[];
  emptyLabel: string;
}) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Ends</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Doctor</TableHead>
            <TableHead>Check-in</TableHead>
            <TableHead>Notes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {appointments.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                {emptyLabel}
              </TableCell>
            </TableRow>
          ) : (
            appointments.map((appt) => {
              const checkin = appt.checkInEvents?.[0];
              return (
                <TableRow key={appt.id}>
                  <TableCell className="text-sm">{formatDate(appt.startsAt)}</TableCell>
                  <TableCell className="text-sm">{formatDate(appt.endsAt)}</TableCell>
                  <TableCell>
                    <Badge variant={appt.status === "CANCELLED" ? "warning" : "default"}>
                      {statusLabels[appt.status as AppointmentStatus] ?? appt.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {appt.doctor?.name || appt.doctor?.email || "—"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {checkin ? (
                      <div className="text-xs">
                        <div>Checked in: {formatDate(checkin.at)}</div>
                        {checkin.desk ? <div>Desk: {checkin.desk}</div> : null}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {appt.notes ? (
                      <Badge variant="outline">Has notes</Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
