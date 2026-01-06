"use client";

import type { MouseEvent, SyntheticEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { enUS } from "date-fns/locale/en-US";
import { format } from "date-fns/format";
import { getDay } from "date-fns/getDay";
import { parse } from "date-fns/parse";
import { startOfWeek } from "date-fns/startOfWeek";
import { Loader2, Mail, Phone, Stethoscope, Trash2 } from "lucide-react";

import "react-big-calendar/lib/css/react-big-calendar.css";

type CalendarEvent = {
  id: string;
  title: string;
  start: string | Date;
  end: string | Date;
  status?: string;
  doctorId?: string;
  doctorName?: string;
  patientExternalId?: string;
  arrivalMode?: string;
  reasonForVisit?: string;
  contactEmail?: string;
  contactPhone?: string;
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date: any) => startOfWeek(date, { weekStartsOn: 1 }),
  getDay,
  locales: { "en-US": enUS },
});

const statusStyles: Record<
  string,
  { bg: string; border: string; color: string }
> = {
  SCHEDULED: {
    bg: "var(--color-primary)",
    border: "var(--color-primary)",
    color: "var(--color-primary-foreground)",
  },
  CHECKED_IN: {
    bg: "#def7ec",
    border: "#6ee7c6",
    color: "#065f46",
  },
  COMPLETED: {
    bg: "#f3f4f6",
    border: "#e5e7eb",
    color: "#111827",
  },
  CANCELLED: {
    bg: "#fee2e2",
    border: "#fca5a5",
    color: "#991b1b",
  },
};

const darkenHex = (hex: string, factor = 0.82) => {
  const normalized = hex.startsWith("#") ? hex.slice(1) : hex;
  if (![3, 6].includes(normalized.length)) return hex;
  const full =
    normalized.length === 3
      ? normalized
          .split("")
          .map((c) => c + c)
          .join("")
      : normalized;
  const num = parseInt(full, 16);
  const r = Math.max(
    0,
    Math.min(255, Math.floor(((num >> 16) & 255) * factor)),
  );
  const g = Math.max(0, Math.min(255, Math.floor(((num >> 8) & 255) * factor)));
  const b = Math.max(0, Math.min(255, Math.floor((num & 255) * factor)));
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
};

const toInputLocal = (date: Date) => {
  const tzOffset = date.getTimezoneOffset() * 60 * 1000;
  const local = new Date(date.getTime() - tzOffset);
  return local.toISOString().slice(0, 16);
};

type PopoverState = {
  event: CalendarEvent | null;
  x: number;
  y: number;
};

export function ReceptionistCalendar({
  events,
  doctorColors,
}: {
  events: CalendarEvent[];
  doctorColors: Record<
    string,
    { bg: string; border: string; color: string; label?: string }
  >;
}) {
  const parsedEvents: CalendarEvent[] = useMemo(
    () =>
      events
        .map((event: CalendarEvent) => ({
          ...event,
          start: new Date(event.start),
          end: new Date(event.end),
        }))
        .filter(
          (event) =>
            !Number.isNaN(event.start.getTime()) &&
            !Number.isNaN(event.end.getTime()),
        ),
    [events],
  );

  const [popover, setPopover] = useState<PopoverState | null>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editTimes, setEditTimes] = useState<{ start: string; end: string }>({
    start: "",
    end: "",
  });
  const dayStart = useMemo(() => {
    const d = new Date();
    d.setHours(7, 0, 0, 0);
    return d;
  }, []);
  const dayEnd = useMemo(() => {
    const d = new Date();
    d.setHours(20, 0, 0, 0);
    return d;
  }, []);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPopover(null);
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, []);

  const getColor = (event: CalendarEvent) => {
    const doctorColor =
      (event.doctorId && doctorColors[event.doctorId]) || undefined;
    if (doctorColor) {
      if (event.status === "CHECKED_IN") {
        return {
          bg: darkenHex(doctorColor.bg),
          border: darkenHex(doctorColor.border),
          color: doctorColor.color,
        };
      }
      if (event.status === "CANCELLED") {
        return {
          bg: `${doctorColor.bg}66`,
          border: doctorColor.border as string,
          color: doctorColor.color as string,
        };
      }
      return doctorColor;
    }
    return statusStyles[event.status ?? "SCHEDULED"];
  };

  const handleSelectEvent = (
    event: CalendarEvent,
    e: MouseEvent | SyntheticEvent<HTMLElement>,
  ) => {
    const native = "clientX" in e ? e : (e as any).nativeEvent;
    const x = native?.clientX ?? window.innerWidth / 2;
    const y = native?.clientY ?? window.innerHeight / 2;
    setPopover({ event, x, y });
    setEditTimes({
      start: toInputLocal(new Date(event.start)),
      end: toInputLocal(new Date(event.end)),
    });
  };

  const cancelAppointment = async (id: string) => {
    if (isCancelling) return;
    if (!window.confirm("Cancel this appointment?")) return;
    setIsCancelling(true);
    const csrf = (window as any).__csrfToken;
    try {
      const res = await fetch(`/api/receptionist/appointments/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(csrf ? { "x-csrf-token": csrf } : {}),
        },
        body: JSON.stringify({ action: "cancel" }),
      });
      if (!res.ok) throw new Error("Failed to cancel");
      setPopover(null);
      window.location.reload();
    } catch (error) {
      console.error(error);
      setIsCancelling(false);
      alert("Could not cancel. Please try again.");
    }
  };

  const updateTime = async (id: string) => {
    if (isUpdating) return;
    const startDate = new Date(editTimes.start);
    const endDate = new Date(editTimes.end);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      alert("Please provide valid start and end times.");
      return;
    }
    if (endDate <= startDate) {
      alert("End time must be after start time.");
      return;
    }
    setIsUpdating(true);
    const csrf = (window as any).__csrfToken;
    try {
      const res = await fetch(`/api/receptionist/appointments/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(csrf ? { "x-csrf-token": csrf } : {}),
        },
        body: JSON.stringify({
          startsAt: startDate,
          endsAt: endDate,
          action:
            popover?.event?.status === "CANCELLED" ? "reschedule" : undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to update time");
      setPopover(null);
      window.location.reload();
    } catch (error) {
      console.error(error);
      setIsUpdating(false);
      alert("Could not update times. Please try again.");
    }
  };

  const deleteAppointment = async (id: string) => {
    if (isDeleting) return;
    if (!window.confirm("Permanently delete this appointment?")) return;
    setIsDeleting(true);
    const csrf = (window as any).__csrfToken;
    try {
      const res = await fetch(`/api/receptionist/appointments/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(csrf ? { "x-csrf-token": csrf } : {}),
        },
        body: JSON.stringify({ action: "delete" }),
      });
      if (!res.ok) throw new Error("Failed to delete");
      setPopover(null);
      window.location.reload();
    } catch (error) {
      console.error(error);
      setIsDeleting(false);
      alert("Could not delete appointment. Please try again.");
    }
  };

  const EventContent = ({ event }: { event: CalendarEvent }) => {
    const palette = getColor(event);
    const cancelled = event.status === "CANCELLED";
    return (
      <div className="flex items-start gap-2 text-xs leading-tight">
        <span
          aria-hidden
          className="mt-0.5 inline-flex size-2.5 rounded-full"
          style={{ backgroundColor: palette.border }}
        />
        <div className="flex-1 space-y-0.5">
          <div
            className={
              cancelled
                ? "line-through opacity-70"
                : "font-semibold text-[0.9rem]"
            }
          >
            <span className="line-clamp-1 text-xs/2">{event.title}</span>
          </div>
          <div
            className={`text-[10px] uppercase tracking-[0.2em] ${cancelled ? "opacity-60" : "opacity-80"}`}
          >
            {event.doctorName ?? "Doctor"} •{" "}
            {event.reasonForVisit ?? event.arrivalMode ?? "Visit"}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      className="rbc-receptionist-wrapper max-h-[720px] overflow-auto rounded-2xl"
      ref={calendarRef}
    >
      <Calendar
        className="rbc-receptionist"
        localizer={localizer}
        events={parsedEvents}
        startAccessor="start"
        endAccessor="end"
        defaultView="week"
        views={["day", "week", "agenda"]}
        step={30}
        timeslots={3}
        popup
        showMultiDayTimes
        style={{ minHeight: "520px", width: "100%" }}
        components={{
          event: EventContent,
        }}
        eventPropGetter={(event) => {
          const palette = getColor(event as CalendarEvent);
          const status = (event as CalendarEvent).status ?? "SCHEDULED";
          return {
            style: {
              backgroundColor: palette.bg,
              borderColor: palette.border,
              color: palette.color,
              boxShadow:
                "0 8px 30px -12px rgb(0 0 0 / 0.16), 0 2px 10px -8px rgb(0 0 0 / 0.1)",
              opacity: status === "CANCELLED" ? 0.65 : 1,
              borderStyle: status === "CANCELLED" ? "dashed" : "solid",
            },
            className: "cursor-pointer",
          };
        }}
        onSelectEvent={handleSelectEvent}
      />

      {popover?.event ? (
        <>
          <div
            className="fixed inset-0 z-60 cursor-pointer bg-black/20"
            onClick={() => setPopover(null)}
          />
          <div
            className="fixed z-61 w-[320px] max-w-[90vw] rounded-2xl border border-border/70 bg-card p-4 shadow-2xl"
            style={{
              top: Math.max(
                12,
                Math.min(popover.y + 12, window.innerHeight - 280),
              ),
              left: Math.max(
                12,
                Math.min(popover.x - 160, window.innerWidth - 340),
              ),
            }}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  {popover.event.arrivalMode || "Scheduled visit"}
                </p>
                <h4 className="text-lg font-semibold leading-tight">
                  {popover.event.title}
                </h4>
                <p className="text-xs text-muted-foreground">
                  {popover.event.patientExternalId
                    ? `ID: ${popover.event.patientExternalId}`
                    : null}
                </p>
              </div>
              <div
                className="flex size-9 items-center justify-center rounded-xl text-sm font-semibold"
                style={{
                  backgroundColor: getColor(popover.event).bg,
                  color: getColor(popover.event).color,
                }}
              >
                {popover.event.status ?? "SCHEDULED"}
              </div>
            </div>

            <div className="mt-3 space-y-3 text-sm">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1 rounded-xl border border-border/70 bg-muted/20 p-3 text-xs">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    Starts
                  </span>
                  <input
                    type="datetime-local"
                    className="mt-1 w-full rounded-lg border border-border/60 bg-card px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                    value={editTimes.start}
                    onChange={(e) =>
                      setEditTimes((prev) => ({
                        ...prev,
                        start: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="flex flex-col gap-1 rounded-xl border border-border/70 bg-muted/20 p-3 text-xs">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    Ends
                  </span>
                  <input
                    type="datetime-local"
                    className="mt-1 w-full rounded-lg border border-border/60 bg-card px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                    value={editTimes.end}
                    onChange={(e) =>
                      setEditTimes((prev) => ({ ...prev, end: e.target.value }))
                    }
                  />
                </div>
              </div>
              {popover.event.reasonForVisit ? (
                <p>
                  <span className="text-muted-foreground">Reason: </span>
                  {popover.event.reasonForVisit}
                </p>
              ) : null}
              <div className="flex items-center gap-2">
                <Stethoscope className="size-4 text-primary" />
                <span className="text-sm font-semibold">
                  {popover.event.doctorName || "Unassigned"}
                </span>
              </div>
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                {popover.event.contactEmail ? (
                  <span className="inline-flex items-center gap-1">
                    <Mail className="size-3" />
                    {popover.event.contactEmail}
                  </span>
                ) : null}
                {popover.event.contactPhone ? (
                  <span className="inline-flex items-center gap-1">
                    <Phone className="size-3" />
                    {popover.event.contactPhone}
                  </span>
                ) : null}
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => updateTime(popover.event!.id)}
                  disabled={
                    isUpdating ||
                    popover.event.status === "CANCELLED" ||
                    popover.event.status === "COMPLETED"
                  }
                  className="inline-flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary transition hover:bg-primary/20 disabled:opacity-50"
                >
                  {isUpdating ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : null}
                  Save time
                </button>
                {popover.event.status === "CANCELLED" ? (
                  <button
                    type="button"
                    onClick={() => updateTime(popover.event!.id)}
                    disabled={isUpdating}
                    className="inline-flex items-center gap-2 rounded-lg border border-emerald-400/50 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-500/20 disabled:opacity-50"
                  >
                    {isUpdating ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : null}
                    Reschedule (Scheduled)
                  </button>
                ) : null}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => cancelAppointment(popover.event!.id)}
                  disabled={
                    isCancelling ||
                    popover.event.status === "CANCELLED" ||
                    popover.event.status === "COMPLETED"
                  }
                  className="inline-flex items-center gap-2 rounded-lg border border-border/70 px-3 py-2 text-xs font-semibold text-destructive transition hover:bg-destructive/10 disabled:opacity-50"
                >
                  {isCancelling ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <Trash2 className="size-3" />
                  )}
                  Cancel appointment
                </button>
                {popover.event.status === "CANCELLED" ? (
                  <button
                    type="button"
                    onClick={() => deleteAppointment(popover.event!.id)}
                    disabled={isDeleting}
                    className="inline-flex items-center gap-2 rounded-lg border border-border/70 px-3 py-2 text-xs font-semibold text-destructive transition hover:bg-destructive/20 disabled:opacity-50"
                  >
                    {isDeleting ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <Trash2 className="size-3" />
                    )}
                    Delete
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </>
      ) : null}

      <style jsx global>{`
        .rbc-receptionist {
          color: var(--color-foreground);
          background: transparent;
          font-size: 0.9rem;
        }
        .rbc-receptionist .rbc-toolbar {
          padding: 0 0 12px;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        .rbc-receptionist .rbc-toolbar button {
          border-radius: 999px;
          padding: 6px 12px;
          border: 1px solid var(--color-border);
          background: var(--color-card);
          color: var(--color-foreground);
        }
        .rbc-receptionist .rbc-toolbar button.rbc-active,
        .rbc-receptionist .rbc-toolbar button:hover {
          background: var(--color-primary);
          border-color: var(--color-primary);
          color: var(--color-primary-foreground);
          box-shadow: 0 10px 25px -15px rgb(0 0 0 / 0.25);
        }
        .rbc-receptionist .rbc-month-view,
        .rbc-receptionist .rbc-time-view,
        .rbc-receptionist .rbc-agenda-view {
          border-color: var(--color-border);
          background: var(--color-card);
          border-radius: 16px;
          overflow: hidden;
        }
        .rbc-receptionist .rbc-time-view {
          box-shadow: inset 0 1px 0
            color-mix(in srgb, var(--color-border) 70%, transparent);
        }
        .rbc-receptionist .rbc-time-header {
          background: linear-gradient(
            180deg,
            var(--color-muted),
            var(--color-card)
          );
        }
        .rbc-receptionist .rbc-time-slot,
        .rbc-receptionist .rbc-time-content,
        .rbc-receptionist .rbc-time-header-content,
        .rbc-receptionist .rbc-day-slot .rbc-time-slot,
        .rbc-receptionist .rbc-agenda-view table tbody > tr + tr {
          border-color: var(--color-border);
        }
        .rbc-receptionist .rbc-event {
          border-radius: 14px;
          border-width: 1px;
          padding: 8px 10px;
          font-weight: 600;
        }
        .rbc-receptionist .rbc-event-content {
          font-size: 0.85rem;
        }
        .rbc-receptionist .rbc-time-content > * + * > * {
          border-color: var(--color-border);
        }
        .rbc-receptionist .rbc-today {
          background: color-mix(in srgb, var(--color-primary) 6%, transparent);
        }
        .rbc-receptionist .rbc-agenda-event-cell {
          font-weight: 600;
        }
        .rbc-receptionist .rbc-agenda-time-cell {
          color: var(--color-muted-foreground);
        }
        .rbc-receptionist .rbc-current-time-indicator {
          background-color: var(--color-destructive);
          height: 2px;
        }
      `}</style>
    </div>
  );
}
