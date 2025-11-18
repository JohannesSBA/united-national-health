"use client";

import { useMemo, useState } from "react";
import { UserStatusValue } from "@/lib/types/admin";
import { AdminActions } from "./admin-actions";

type AdminRecord = {
  id: string;
  name: string;
  email: string;
  status: UserStatusValue;
  hospitalMemberships: { hospital: { id: string; name: string } }[];
};

type HospitalOption = {
  id: string;
  name: string;
};

export function AdminList({
  admins,
  hospitals,
}: {
  admins: AdminRecord[];
  hospitals: HospitalOption[];
}) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const query = search.toLowerCase();
    if (!query) return admins;
    return admins.filter((admin) => {
      const hospitalNames = admin.hospitalMemberships
        .map((membership) => membership.hospital.name.toLowerCase())
        .join(" ");
      return (
        admin.name.toLowerCase().includes(query) ||
        admin.email.toLowerCase().includes(query) ||
        hospitalNames.includes(query)
      );
    });
  }, [search, admins]);

  return (
    <div className="space-y-3">
      <input
        className="w-full rounded-xl border border-border bg-card px-4 py-2 text-sm"
        placeholder="Search admins by name, email, or hospital"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      {filtered.map((admin) => (
        <article
          key={admin.id}
          className="rounded-2xl border border-border/60 bg-card/90 p-5 shadow-sm"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-lg font-semibold">{admin.name}</h3>
              <p className="text-sm text-muted-foreground">{admin.email}</p>
            </div>
            <span className="text-xs font-semibold uppercase tracking-wide text-primary">
              {admin.status}
            </span>
          </div>
          <p className="mt-2 text-sm">
            Hospitals:{" "}
            {admin.hospitalMemberships.length
              ? admin.hospitalMemberships
                  .map((membership) => membership.hospital.name)
                  .join(", ")
              : "No assignments"}
          </p>
          <div className="mt-4">
            <AdminActions
              userId={admin.id}
              status={admin.status}
              hospitals={hospitals}
            />
          </div>
        </article>
      ))}
      {!filtered.length ? (
        <p className="text-sm text-muted-foreground">
          No administrators match that search.
        </p>
      ) : null}
    </div>
  );
}
