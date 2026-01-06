"use client";

import { useMemo, useState, useTransition } from "react";
import type { FormEvent } from "react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Select } from "@/app/components/ui/select";
import { Textarea } from "@/app/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  CalendarRange,
  ClipboardList,
  ContactRound,
  Search,
  UserRound,
  X,
} from "lucide-react";

type DoctorOption = {
  id: string;
  name: string;
  email: string;
};

type PatientMatch = {
  patientExternalId: string;
  patientDisplayName: string;
  doctorId?: string | null;
  startsAt?: string;
  endsAt?: string;
  notes?: Record<string, any> | null;
};

const arrivalOptions = [
  "Walk-in",
  "Referral",
  "Ambulance",
  "Follow-up",
  "Telehealth",
];

export function AppointmentForm({
  hospitalId,
  doctors,
}: {
  hospitalId: string;
  doctors: DoctorOption[];
}) {
  const [open, setOpen] = useState(false);
  const [lookupStatus, setLookupStatus] = useState<
    "idle" | "searching" | "found" | "not-found" | "error"
  >("idle");
  const [lookupMessage, setLookupMessage] = useState<string | null>(null);
  const [duplicateError, setDuplicateError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const toInputLocal = (date: Date) => {
    const tzOffset = date.getTimezoneOffset() * 60 * 1000;
    const local = new Date(date.getTime() - tzOffset);
    return local.toISOString().slice(0, 16);
  };

  const minStart = toInputLocal(new Date());
  const durationOptions = [15, 30, 45, 60];

  const getDefaultTimes = () => {
    const now = new Date();
    const rounded = new Date(
      Math.ceil(now.getTime() / (30 * 60 * 1000)) * 30 * 60 * 1000,
    );
    const end = new Date(rounded.getTime() + 30 * 60 * 1000);
    return {
      start: toInputLocal(rounded),
      end: toInputLocal(end),
    };
  };

  const defaultTimes: { start: string; end: string } = useMemo(
    () => getDefaultTimes(),
    [],
  );

  const [form, setForm] = useState({
    doctorId: "",
    patientExternalId: "",
    patientDisplayName: "",
    contactEmail: "",
    contactPhone: "",
    reasonForVisit: "",
    arrivalMode: arrivalOptions[0],
    insuranceProvider: "",
    startsAt: defaultTimes.start,
    endsAt: defaultTimes.end,
    notes: "",
  });

  const [matchedPatient, setMatchedPatient] = useState<PatientMatch | null>(
    null,
  );

  const toInputDate = (value?: string | Date | null) => {
    if (!value) return "";
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return toInputLocal(date);
  };

  const isConflict = (match: PatientMatch, next: typeof form) => {
    const normalize = (value?: unknown) =>
      typeof value === "string" ? value.trim().toLowerCase() : "";
    const normalizePhone = (value?: unknown) =>
      typeof value === "string" || typeof value === "number"
        ? String(value).replace(/\s+/g, "")
        : "";
    const matchNotes = (match.notes ?? {}) as Record<string, any>;

    const nameConflict =
      normalize(match.patientDisplayName) &&
      normalize(next.patientDisplayName) &&
      normalize(match.patientDisplayName) !==
        normalize(next.patientDisplayName);

    const emailConflict =
      normalize(matchNotes.contactEmail) &&
      normalize(next.contactEmail) &&
      normalize(matchNotes.contactEmail) !== normalize(next.contactEmail);

    const phoneConflict =
      normalizePhone(matchNotes.contactPhone) &&
      normalizePhone(next.contactPhone) &&
      normalizePhone(matchNotes.contactPhone) !==
        normalizePhone(next.contactPhone);

    return nameConflict || emailConflict || phoneConflict;
  };

  const updateFormField = <K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K],
  ) => {
    setForm((prev) => {
      let next = { ...prev, [key]: value };

      if (key === "startsAt") {
        const now = new Date();
        const inputDate = new Date(String(value));
        if (!Number.isNaN(inputDate.getTime())) {
          const startDate = inputDate < now ? now : inputDate;
          next.startsAt = toInputLocal(startDate);
          const endDate = new Date(next.endsAt);
          const minEnd = new Date(startDate.getTime() + 30 * 60 * 1000);
          if (Number.isNaN(endDate.getTime()) || endDate <= startDate) {
            next.endsAt = toInputLocal(minEnd);
          }
        }
      }

      if (key === "endsAt") {
        const startDate = new Date(next.startsAt);
        const endDate = new Date(String(value));
        if (!Number.isNaN(startDate.getTime())) {
          const minEnd = new Date(startDate.getTime() + 30 * 60 * 1000);
          if (Number.isNaN(endDate.getTime()) || endDate <= startDate) {
            next.endsAt = toInputLocal(minEnd);
          } else {
            next.endsAt = toInputLocal(endDate);
          }
        }
      }

      if (matchedPatient) {
        const conflict = isConflict(matchedPatient, next);
        setDuplicateError(
          conflict
            ? "ID already exists. Use lookup to load the existing patient instead."
            : null,
        );
        if (!conflict && lookupStatus === "error") {
          setLookupStatus("idle");
        }
      }
      return next;
    });
  };

  const setEndDuration = (minutes: number) => {
    const startDate = new Date(form.startsAt);
    if (Number.isNaN(startDate.getTime())) return;
    const newEnd = new Date(startDate.getTime() + minutes * 60 * 1000);
    updateFormField("endsAt", toInputLocal(newEnd));
  };

  const ensureFutureTimes = () => {
    const now = new Date();
    const defaults = getDefaultTimes();
    setForm((prev) => {
      const startDate = new Date(prev.startsAt);
      if (Number.isNaN(startDate.getTime()) || startDate < now) {
        return { ...prev, startsAt: defaults.start, endsAt: defaults.end };
      }
      return prev;
    });
  };

  const handleLookup = async () => {
    if (!form.patientExternalId.trim() && !form.patientDisplayName.trim()) {
      setLookupStatus("error");
      setLookupMessage("Enter a patient ID or name to search.");
      return;
    }
    setLookupStatus("searching");
    setLookupMessage(null);
    try {
      const params = new URLSearchParams({ hospitalId });
      if (form.patientExternalId.trim()) {
        params.set("patientExternalId", form.patientExternalId.trim());
      }
      if (form.patientDisplayName.trim()) {
        params.set("patientName", form.patientDisplayName.trim());
      }
      const res = await fetch(
        `/api/receptionist/patients?${params.toString()}`,
      );
      if (!res.ok) {
        throw new Error("Lookup failed");
      }
      const json = await res.json();
      if (!json?.data) {
        setMatchedPatient(null);
        setLookupStatus("not-found");
        setLookupMessage("No patient found. You can register them below.");
        setDuplicateError(null);
        return;
      }
      const match: PatientMatch = json.data;
      const nextForm = {
        ...form,
        patientExternalId:
          match.patientExternalId || form.patientExternalId || "",
        patientDisplayName:
          match.patientDisplayName || form.patientDisplayName || "",
        doctorId: match.doctorId || form.doctorId || "",
        startsAt: form.startsAt,
        endsAt: form.endsAt,
        contactEmail:
          (match.notes as any)?.contactEmail ?? form.contactEmail ?? "",
        contactPhone:
          (match.notes as any)?.contactPhone ?? form.contactPhone ?? "",
        reasonForVisit:
          (match.notes as any)?.reasonForVisit ?? form.reasonForVisit ?? "",
        arrivalMode:
          (match.notes as any)?.arrivalMode ?? form.arrivalMode ?? "",
        insuranceProvider:
          (match.notes as any)?.insuranceProvider ??
          form.insuranceProvider ??
          "",
        notes: (match.notes as any)?.receptionNotes ?? form.notes ?? "",
      };
      setMatchedPatient(match);
      setForm(nextForm);
      const conflict = isConflict(match, nextForm);
      setDuplicateError(
        conflict
          ? "ID already exists. Use lookup to load the existing patient instead."
          : null,
      );
      setLookupStatus(conflict ? "error" : "found");
      setLookupMessage(
        conflict ? null : "Existing patient found. Details pre-filled.",
      );
    } catch (error) {
      console.error(error);
      setLookupStatus("error");
      setLookupMessage("Could not complete lookup. Try again.");
      setDuplicateError(null);
    }
  };

  const resetForm = () => {
    const freshTimes = getDefaultTimes();
    setForm({
      doctorId: "",
      patientExternalId: "",
      patientDisplayName: "",
      contactEmail: "",
      contactPhone: "",
      reasonForVisit: "",
      arrivalMode: arrivalOptions[0],
      insuranceProvider: "",
      startsAt: freshTimes.start,
      endsAt: freshTimes.end,
      notes: "",
    });
    setMatchedPatient(null);
    setLookupStatus("idle");
    setLookupMessage(null);
    setDuplicateError(null);
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.doctorId) {
      setLookupStatus("error");
      setLookupMessage("Select a doctor to proceed.");
      return;
    }
    if (new Date(form.endsAt) <= new Date(form.startsAt)) {
      setLookupStatus("error");
      setLookupMessage("End time must be after start time.");
      return;
    }
    if (duplicateError) {
      setLookupStatus("error");
      setLookupMessage(duplicateError);
      return;
    }

    startTransition(async () => {
      const payload = {
        hospitalId,
        doctorId: form.doctorId,
        patientExternalId: form.patientExternalId,
        patientDisplayName: form.patientDisplayName,
        startsAt: form.startsAt,
        endsAt: form.endsAt,
        notes: {
          contactEmail: form.contactEmail,
          contactPhone: form.contactPhone,
          reasonForVisit: form.reasonForVisit,
          arrivalMode: form.arrivalMode,
          insuranceProvider: form.insuranceProvider,
          receptionNotes: form.notes,
          matchedPatientId: matchedPatient?.patientExternalId ?? null,
        },
      };

      const res = await fetch("/api/receptionist/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.status === 409) {
        setDuplicateError(
          "ID already exists. Use lookup to load the existing patient instead.",
        );
        setLookupStatus("error");
        setLookupMessage(null);
        return;
      }

      if (!res.ok) {
        setLookupStatus("error");
        setLookupMessage(
          "Could not create appointment. Check fields and retry.",
        );
        return;
      }

      resetForm();
      setOpen(false);
      location.reload();
    });
  };

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">
            New appointment
          </p>
          <p className="text-xs text-muted-foreground">
            Search for an existing patient by ID or name, or register a new one
            with full intake details.
          </p>
        </div>
        <Button
          onClick={() => {
            ensureFutureTimes();
            setOpen(true);
          }}
          size="sm"
        >
          Schedule appointment
        </Button>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-4xl overflow-hidden rounded-3xl border border-border/70 bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border/70 px-6 py-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Register patient & book
                </p>
                <h3 className="text-xl font-semibold">Appointment details</h3>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Close"
                onClick={() => {
                  setOpen(false);
                  resetForm();
                }}
              >
                <X className="size-4" />
              </Button>
            </div>

            <form onSubmit={submit} className="space-y-5 px-6 py-5">
              <div className="grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <Search className="size-4 text-primary" />
                      Patient lookup
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleLookup}
                      disabled={lookupStatus === "searching"}
                    >
                      {lookupStatus === "searching" ? "Searching..." : "Lookup"}
                    </Button>
                  </div>
                  <div className="mt-3 grid gap-3">
                    <Input
                      placeholder="Patient External ID / MRN"
                      value={form.patientExternalId}
                      onChange={(e) =>
                        updateFormField("patientExternalId", e.target.value)
                      }
                      required
                    />
                    <Input
                      placeholder="Patient full name"
                      value={form.patientDisplayName}
                      onChange={(e) =>
                        updateFormField("patientDisplayName", e.target.value)
                      }
                      required
                    />
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Input
                        type="email"
                        placeholder="Contact email"
                        value={form.contactEmail}
                        onChange={(e) =>
                          updateFormField("contactEmail", e.target.value)
                        }
                      />
                      <Input
                        placeholder="Contact phone"
                        value={form.contactPhone}
                        onChange={(e) =>
                          updateFormField("contactPhone", e.target.value)
                        }
                      />
                    </div>
                    <Textarea
                      placeholder="Reason for visit or symptoms"
                      value={form.reasonForVisit}
                      onChange={(e) =>
                        updateFormField("reasonForVisit", e.target.value)
                      }
                      rows={3}
                    />
                  </div>
                  {lookupMessage ? (
                    <p
                      className={cn(
                        "mt-3 text-xs",
                        lookupStatus === "found"
                          ? "text-emerald-600"
                          : lookupStatus === "not-found"
                            ? "text-amber-600"
                            : "text-destructive",
                      )}
                    >
                      {lookupMessage}
                    </p>
                  ) : null}
                  {duplicateError ? (
                    <div className="mt-3 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                      {duplicateError}
                    </div>
                  ) : null}
                  {matchedPatient ? (
                    <div className="mt-3 rounded-xl border border-border/70 bg-card/70 p-3 text-xs">
                      <p className="font-semibold text-foreground">
                        Match found
                      </p>
                      <p className="text-muted-foreground">
                        Last visit:{" "}
                        {matchedPatient.startsAt
                          ? new Date(matchedPatient.startsAt).toLocaleString()
                          : "n/a"}
                      </p>
                    </div>
                  ) : null}
                </div>

                <div className="rounded-2xl border border-border/70 bg-card/80 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <UserRound className="size-4 text-primary" />
                    Assign & timing
                  </div>
                  <div className="mt-3 grid gap-3">
                    <Select
                      value={form.doctorId}
                      onChange={(e) =>
                        updateFormField("doctorId", e.target.value)
                      }
                      required
                      aria-label="Select doctor"
                      disabled={doctors.length === 0}
                    >
                      {doctors.length === 0 ? (
                        <option value="" disabled>
                          No doctors available
                        </option>
                      ) : null}
                      {doctors.length > 0 ? (
                        <option value="">Select a doctor</option>
                      ) : null}
                      {doctors.map((doctor) => (
                        <option key={doctor.id} value={doctor.id}>
                          {doctor.name || doctor.email}
                        </option>
                      ))}
                    </Select>

                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="rounded-xl border border-border/70 bg-muted/30 p-3">
                        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          <CalendarRange className="size-4 text-primary" />
                          Starts
                        </p>
                        <Input
                          type="datetime-local"
                          value={form.startsAt}
                          min={minStart}
                          onChange={(e) =>
                            updateFormField("startsAt", e.target.value)
                          }
                          required
                        />
                      </div>
                      <div className="rounded-xl border border-border/70 bg-muted/30 p-3">
                        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          <CalendarRange className="size-4 text-primary" />
                          Ends
                        </p>
                        <Input
                          type="datetime-local"
                          value={form.endsAt}
                          min={form.startsAt || minStart}
                          onChange={(e) =>
                            updateFormField("endsAt", e.target.value)
                          }
                          required
                        />
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        Quick duration
                      </p>
                      {durationOptions.map((minutes) => (
                        <Button
                          key={minutes}
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-8 rounded-full border-border/70 px-3 text-xs"
                          onClick={() => setEndDuration(minutes)}
                        >
                          +{minutes} min
                        </Button>
                      ))}
                      <p className="text-xs text-muted-foreground">
                        End auto-adjusts if set before the start.
                      </p>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2">
                      <Select
                        value={form.arrivalMode}
                        onChange={(e) =>
                          updateFormField("arrivalMode", e.target.value)
                        }
                      >
                        {arrivalOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </Select>
                      <Input
                        placeholder="Insurance provider (optional)"
                        value={form.insuranceProvider}
                        onChange={(e) =>
                          updateFormField("insuranceProvider", e.target.value)
                        }
                      />
                    </div>

                    <div className="rounded-xl border border-border/70 bg-muted/30 p-3">
                      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        <ClipboardList className="size-4 text-primary" />
                        Reception notes
                      </p>
                      <Textarea
                        placeholder="Special instructions, mobility considerations, language preferences..."
                        value={form.notes}
                        onChange={(e) =>
                          updateFormField("notes", e.target.value)
                        }
                        rows={3}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <ContactRound className="size-4 text-primary" />
                  Data is saved to the appointment and reused on the next
                  lookup.
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setOpen(false);
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isPending || doctors.length === 0}
                  >
                    {isPending ? "Creating..." : "Create appointment"}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
