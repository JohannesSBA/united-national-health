import { AppointmentForm } from "@/app/components/receptionist/appointment-form";
import { AppointmentList } from "@/app/components/receptionist/appointment-list";
import { DoctorAvailabilityPanel } from "@/app/components/receptionist/doctor-availability-panel";
import { ReceptionistCalendar } from "@/app/components/receptionist/receptionist-calendar";
import {
  receptionistNavItems,
  ReceptionistHeader,
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
import { buttonVariants } from "@/app/components/ui/button";
import { db } from "@/lib/db";
import { cn } from "@/lib/utils";
import { requireReceptionist } from "@/lib/require-receptionist";
import { User } from "@/generated/prisma/client";
import {
  Activity,
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Clock3,
  TimerReset,
} from "lucide-react";
import Link from "next/link";
import { type ReactNode } from "react";
import { CSRF_HEADER_NAME } from "@/lib/security/csrf";

function CsrfTokenBootstrap() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          (async function(){
            try {
              const res = await fetch('/api/receptionist/csrf', { credentials: 'include' });
              if (!res.ok) return;
              const data = await res.json();
              if (data?.token) {
                window.__csrfToken = data.token;
                window.__csrfHeader = '${CSRF_HEADER_NAME}';
              }
            } catch (e) { /* noop */ }
          })();
        `,
      }}
    />
  );
}

export default async function ReceptionistPage() {
  const session = await requireReceptionist();

  const membership = await db.hospitalUser.findFirst({
    where: { userId: session.user.id },
    include: { hospital: true },
  });

  if (!membership?.hospital) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Reception</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You are not assigned to a hospital. Please contact an administrator.
        </p>
      </div>
    );
  }

  const hospital = membership.hospital;

  // Use untyped handle for newly added models until Prisma types are regenerated
  const anyDb = db as any;
  const [appointments, availability, doctors] = await Promise.all([
    anyDb.appointment.findMany({
      where: { hospitalId: hospital.id },
      orderBy: { startsAt: "asc" },
      take: 50,
    }),
    anyDb.doctorAvailability.findMany({
      where: { hospitalId: hospital.id },
      orderBy: { updatedAt: "desc" },
      take: 50,
    }),
    anyDb.staffMember.findMany({
      where: { hospitalId: hospital.id, role: "DOCTOR" },
      include: { user: true },
      orderBy: { user: { name: "asc" } },
    }),
  ]);

  const toDate = (value: any) => new Date(value);
  const isToday = (date: Date) => {
    const now = new Date();
    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate()
    );
  };

  const todaysAppointments = appointments.filter((appt: any) =>
    isToday(toDate(appt.startsAt)),
  );
  const metrics = {
    scheduledToday: todaysAppointments.filter(
      (appt: any) => appt.status === "SCHEDULED",
    ).length,
    checkedInToday: todaysAppointments.filter(
      (appt: any) => appt.status === "CHECKED_IN",
    ).length,
    completedToday: todaysAppointments.filter(
      (appt: any) => appt.status === "COMPLETED",
    ).length,
    cancelledToday: todaysAppointments.filter(
      (appt: any) => appt.status === "CANCELLED",
    ).length,
  };

  const nextAppointment = appointments.find(
    (appt: any) => toDate(appt.startsAt) > new Date(),
  );

  const doctorPalette = [
    { bg: "#E6F4FF", border: "#8CC8FF", color: "#0A3C7D" },
    { bg: "#F4F1FF", border: "#C8B5FF", color: "#3B2A7E" },
    { bg: "#EAFBF4", border: "#9BE4C7", color: "#0E6948" },
    { bg: "#FFF6E5", border: "#F7D08A", color: "#7A4C00" },
    { bg: "#FFE9EF", border: "#F8B7CB", color: "#7D143D" },
    { bg: "#EAF2FF", border: "#A7C3FF", color: "#163D88" },
    { bg: "#EAFBFF", border: "#94E1F5", color: "#0C5A6E" },
  ];

  const doctorColorMap = doctors.reduce(
    (
      acc: Record<
        string,
        { bg: string; border: string; color: string; label: string }
      >,
      doc: any,
      idx: number,
    ) => {
      const palette = doctorPalette[idx % doctorPalette.length];
      acc[doc.userId] = {
        ...palette,
        label: doc.user?.name || doc.user?.email || "Doctor",
      };
      return acc;
    },
    {},
  );

  const doctorNameById = doctors.reduce(
    (acc: Record<string, string>, doc: any) => {
      acc[doc.userId] = doc.user?.name || doc.user?.email || "Doctor";
      return acc;
    },
    {},
  );

  const calendarEvents = appointments.map((appt: any) => {
    const notes = (appt.notes ?? {}) as Record<string, any>;
    return {
      id: appt.id,
      title: appt.patientDisplayName,
      start: toDate(appt.startsAt).toISOString(),
      end: toDate(appt.endsAt).toISOString(),
      status: appt.status,
      doctorId: appt.doctorId,
      doctorName: doctorNameById[appt.doctorId] ?? "Doctor",
      patientExternalId: appt.patientExternalId,
      arrivalMode: notes.arrivalMode,
      reasonForVisit: notes.reasonForVisit,
      contactEmail: notes.contactEmail,
      contactPhone: notes.contactPhone,
    };
  });

  return (
    <div className="space-y-8 p-6">
      <ReceptionistHeader user={session.user as User} />
      <CsrfTokenBootstrap />

      <WorkspaceNav
        badge={<Badge variant="outline">Main overview</Badge>}
        items={receptionistNavItems as any}
      />

      <div className="grid gap-6 xl:grid-cols-1">
        <Card className="border-border/70 bg-card/95 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <CalendarClock className="size-5 text-primary" />
                  Calendar & queue
                </CardTitle>
                <CardDescription>
                  See the upcoming day/week and open appointments at a glance.
                </CardDescription>
              </div>
              <Badge variant="outline" className="rounded-full px-3 py-1">
                Live sync
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <ReceptionistCalendar
              events={calendarEvents}
              doctorColors={doctorColorMap}
            />
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <Card className="border-border/70 bg-card/95 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Activity className="size-5 text-primary" />
                Today at a glance
              </CardTitle>
              <CardDescription>
                Keep tabs on arrivals, check-ins, and completions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                <StatusTile
                  label="Scheduled today"
                  value={metrics.scheduledToday}
                  accent="bg-primary/10 text-primary"
                />
                <StatusTile
                  label="Checked in"
                  value={metrics.checkedInToday}
                  accent="bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-100"
                  icon={<CheckCircle2 className="size-4" />}
                />
                <StatusTile
                  label="Completed"
                  value={metrics.completedToday}
                  accent="bg-muted text-foreground"
                />
                <StatusTile
                  label="Cancelled"
                  value={metrics.cancelledToday}
                  accent="bg-destructive/10 text-destructive"
                />
              </div>
              <div className="mt-4 space-y-2 rounded-xl border border-border/70 bg-muted/30 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Doctor colors
                </p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(doctorColorMap).map(([id, palette]) => (
                    <div
                      key={id}
                      className="flex items-center gap-2 rounded-full border border-border/70 bg-card/70 px-3 py-1 text-xs font-semibold"
                    >
                      <span
                        aria-hidden
                        className="inline-flex size-4 rounded-full"
                        style={{
                          backgroundColor: (
                            palette as { bg: string; border: string }
                          ).bg,
                          border: `1px solid ${(palette as { border: string }).border}`,
                        }}
                      />
                      {(palette as { label: string }).label}
                    </div>
                  ))}
                  {Object.keys(doctorColorMap).length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No doctors available to display.
                    </p>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/95 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock3 className="size-5 text-primary" />
                Next arrival
              </CardTitle>
              <CardDescription>
                Prepare the desk for the next patient on the board.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {nextAppointment ? (
                <div className="rounded-2xl border border-border/70 bg-gradient-to-br from-muted/60 via-card to-card p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                        Patient
                      </p>
                      <p className="text-lg font-semibold">
                        {nextAppointment.patientDisplayName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(nextAppointment.startsAt).toLocaleString()}
                      </p>
                    </div>
                    <Badge variant="success" className="rounded-full px-3 py-1">
                      {nextAppointment.status}
                    </Badge>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  You&apos;re clear—no upcoming appointments in the queue.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        <Card className="border-border/70 bg-card/95 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="size-5 text-primary" />
              Appointment desk
            </CardTitle>
            <CardDescription>
              Create, manage, and check in appointments without leaving your
              station.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">
                    New appointment
                  </p>
                  <Badge
                    variant="outline"
                    className="rounded-full px-2 py-0.5 text-xs"
                  >
                    Quick add
                  </Badge>
                </div>
                <div className="mt-3">
                  <AppointmentForm
                    hospitalId={hospital.id}
                    doctors={doctors.map((doc: any) => ({
                      id: doc.userId,
                      name: doc.user?.name,
                      email: doc.user?.email,
                    }))}
                  />
                </div>
              </div>
              <div className="rounded-2xl border border-border/70 bg-card/80 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">
                    Upcoming queue
                  </p>
                  <Badge
                    variant="outline"
                    className="rounded-full px-2 py-0.5 text-xs"
                  >
                    Auto-refresh
                  </Badge>
                </div>
                <div className="mt-3 max-h-[420px] space-y-3 overflow-auto pr-2">
                  <AppointmentList appointments={appointments} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/95 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <TimerReset className="size-5 text-primary" />
              Doctor availability
            </CardTitle>
            <CardDescription>
              Live view of on-duty doctors so you can match patients quickly.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DoctorAvailabilityPanel
              hospitalId={hospital.id}
              initialData={availability}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatusTile({
  label,
  value,
  accent,
  icon,
}: {
  label: string;
  value: number;
  accent: string;
  icon?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-card/80 px-4 py-3 shadow-xs">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          {label}
        </p>
        <p className="mt-1 text-2xl font-semibold">{value}</p>
      </div>
      <div
        className={cn(
          "flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold",
          accent,
        )}
      >
        {icon}
        <span>{value > 0 ? "Active" : "None"}</span>
      </div>
    </div>
  );
}
