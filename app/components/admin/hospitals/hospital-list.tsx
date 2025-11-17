"use client";

import { useMemo, useState } from "react";
import {
  HospitalStatusValue,
  OnboardingPriorityValue,
  OnboardingStatusValue,
} from "@/lib/types/admin";
import { HospitalStatusActions } from "./hospital-status-actions";
import { HospitalOnboardingActions } from "./hospital-onboarding-actions";
import { HospitalDetailsForm } from "./hospital-details-form";
import { HospitalOnboardingForm } from "./hospital-onboarding-form";

type HospitalItem = {
  id: string;
  name: string;
  status: HospitalStatusValue;
  region: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  description: string | null;
  _count: { members: number };
  onboardingActions: {
    id: string;
    action: string;
    owner: string;
    dueDate: string;
    priority: OnboardingPriorityValue;
    status: OnboardingStatusValue;
  }[];
};

export function HospitalList({ hospitals }: { hospitals: HospitalItem[] }) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const query = search.toLowerCase();
    if (!query) return hospitals;
    return hospitals.filter((hospital) => {
      return (
        hospital.name.toLowerCase().includes(query) ||
        (hospital.region ?? "").toLowerCase().includes(query) ||
        (hospital.contactEmail ?? "").toLowerCase().includes(query)
      );
    });
  }, [search, hospitals]);

  return (
    <div className="space-y-4">
      <input
        className="w-full rounded-xl border border-border bg-card px-4 py-2 text-sm"
        placeholder="Search hospitals by name, region, or contact"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      {filtered.map((hospital) => (
        <article
          key={hospital.id}
          className="rounded-2xl border border-border/60 bg-card/95 p-6 shadow-sm"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-xl font-semibold">{hospital.name}</h3>
              <p className="text-sm text-muted-foreground">
                {hospital.region ?? "Region TBD"} &middot;{" "}
                {hospital._count.members} linked staff
              </p>
            </div>
            <span className="rounded-full border border-border px-3 py-1 text-xs font-medium uppercase tracking-wide">
              {hospital.status}
            </span>
          </div>
          {hospital.description ? (
            <p className="mt-2 text-sm text-muted-foreground">
              {hospital.description}
            </p>
          ) : null}
          <dl className="mt-4 grid gap-4 text-sm md:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Contact email</dt>
              <dd>{hospital.contactEmail ?? "Not provided"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Contact phone</dt>
              <dd>{hospital.contactPhone ?? "Not provided"}</dd>
            </div>
          </dl>
          <div className="mt-4 flex flex-wrap items-start gap-4">
            <HospitalStatusActions
              hospitalId={hospital.id}
              status={hospital.status}
            />
            <HospitalDetailsForm hospital={hospital} />
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-border/60 p-4">
              <h4 className="text-sm font-semibold">Custom onboarding item</h4>
              <HospitalOnboardingForm hospitalId={hospital.id} />
            </div>
            <div>
              <HospitalOnboardingActions actions={hospital.onboardingActions} />
            </div>
          </div>
        </article>
      ))}
      {!filtered.length ? (
        <p className="text-sm text-muted-foreground">
          No hospitals match that search.
        </p>
      ) : null}
    </div>
  );
}
