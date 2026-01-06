"use client";

import { useMemo, useTransition, type FormEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";
import type { PatientListResult } from "@/lib/receptionist/patients";

type PatientsTableProps = {
  data: PatientListResult;
  query: {
    q?: string;
    status?: string;
    hasUpcoming?: boolean;
    sort?: string;
    page?: number;
  };
};

export function PatientsTable({ data, query }: PatientsTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(data.total / data.pageSize)),
    [data],
  );

  const updateQuery = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === "") {
        next.delete(key);
      } else {
        next.set(key, value);
      }
    });
    startTransition(() => {
      router.push(`${pathname}?${next.toString()}`);
    });
  };

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    updateQuery({
      q: (formData.get("q") as string) || "",
      page: "1",
    });
  };

  const setPage = (page: number) => {
    updateQuery({ page: String(Math.max(1, Math.min(totalPages, page))) });
  };

  return (
    <div className="rounded-2xl border border-border/70 bg-card/95 p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-lg font-semibold">Patients</p>
          <p className="text-sm text-muted-foreground">
            Derived from appointments for this hospital.
          </p>
        </div>
        <form onSubmit={handleSearch} className="flex flex-wrap items-center gap-2">
          <Input
            name="q"
            placeholder="Search name or ID"
            defaultValue={query.q}
            className="w-56"
          />
          <select
            name="status"
            defaultValue={query.status || ""}
            className="h-9 rounded-md border border-border/70 bg-background px-3 text-sm"
            onChange={(e) => updateQuery({ status: e.target.value || null, page: "1" })}
          >
            <option value="">Any status</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="CHECKED_IN">Checked in</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          <select
            name="hasUpcoming"
            defaultValue={
              query.hasUpcoming === undefined ? "" : query.hasUpcoming ? "true" : "false"
            }
            className="h-9 rounded-md border border-border/70 bg-background px-3 text-sm"
            onChange={(e) =>
              updateQuery({
                hasUpcoming: e.target.value || null,
                page: "1",
              })
            }
          >
            <option value="">Any upcoming</option>
            <option value="true">Has upcoming</option>
            <option value="false">No upcoming</option>
          </select>
          <select
            name="sort"
            defaultValue={query.sort || "last-desc"}
            className="h-9 rounded-md border border-border/70 bg-background px-3 text-sm"
            onChange={(e) => updateQuery({ sort: e.target.value, page: "1" })}
          >
            <option value="last-desc">Last visit (newest)</option>
            <option value="name-asc">Name A → Z</option>
            <option value="next-asc">Next appointment</option>
            <option value="total-desc">Total visits</option>
          </select>
          <Button type="submit" size="sm" disabled={isPending}>
            Search
          </Button>
        </form>
      </div>

      <div className="mt-4 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Patient</TableHead>
              <TableHead>External ID</TableHead>
              <TableHead>Last appointment</TableHead>
              <TableHead>Next appointment</TableHead>
              <TableHead className="text-right">Totals</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.patients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                  No patients found.
                </TableCell>
              </TableRow>
            ) : (
              data.patients.map((patient) => (
                <TableRow key={patient.patientExternalId}>
                  <TableCell>
                    <div className="font-semibold">
                      {patient.displayName || "Unknown name"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {patient.lastAppt
                        ? new Date(patient.lastAppt).toLocaleDateString()
                        : "No visits yet"}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm font-mono">
                    {patient.patientExternalId}
                  </TableCell>
                  <TableCell className="text-sm">
                    {patient.lastAppt
                      ? new Date(patient.lastAppt).toLocaleString()
                      : "—"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {patient.nextAppt ? (
                      <div className="flex items-center gap-2">
                        <span>{new Date(patient.nextAppt).toLocaleString()}</span>
                        <Badge variant="success">Upcoming</Badge>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">None</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    <div className="font-semibold">{patient.totalCount}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {patient.completedCount} completed · {patient.cancelledCount} cancelled
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        router.push(
                          `/receptionist/patients/${encodeURIComponent(
                            patient.patientExternalId,
                          )}`,
                        )
                      }
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
        <div className="text-muted-foreground">
          Page {data.page} of {totalPages} • {data.total} patients
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={data.page <= 1 || isPending}
            onClick={() => setPage(data.page - 1)}
          >
            Previous
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={data.page >= totalPages || isPending}
            onClick={() => setPage(data.page + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
