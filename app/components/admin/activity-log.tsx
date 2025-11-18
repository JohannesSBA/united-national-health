"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AdministrativeActivity } from "@/lib/global-admin-data";
import { stripEmailLogTag } from "@/lib/email-log-tag";
import { History, Search } from "lucide-react";
import type { ReactNode } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
export type ActivityLogProps = {
  activity: AdministrativeActivity[];
  actions?: ReactNode;
};

export function ActivityLog({ activity, actions }: ActivityLogProps) {
  const [query, setQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState("");

  const filteredActivity = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const normalizedDate = selectedDate.trim();

    return activity.filter((event) => {
      const cleanAction = stripEmailLogTag(event.action);
      const matchesQuery = normalizedQuery
        ? cleanAction.toLowerCase().includes(normalizedQuery) ||
          event.scope.toLowerCase().includes(normalizedQuery) ||
          event.actor.toLowerCase().includes(normalizedQuery)
        : true;
      const matchesDate = normalizedDate
        ? new Date(event.timestamp).toISOString().slice(0, 10) ===
          normalizedDate
        : true;
      return matchesQuery && matchesDate;
    });
  }, [activity, query, selectedDate]);

  return (
    <Card className="border border-border/70 bg-card shadow-sm">
      <CardHeader className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-3">
          <History
            className="size-5 text-muted-foreground"
            aria-hidden="true"
          />
          <div>
            <CardTitle className="text-base font-semibold">
              Administrative Activity
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Latest governance and platform operations.
            </p>
          </div>
        </div>
        {actions ? <div className="ml-auto">{actions}</div> : null}
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Filter by actor, action, or scope"
              className="pl-10"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div>
            <Input
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
            />
          </div>
        </div>
        {filteredActivity.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {activity.length === 0
              ? "No administrative events have been recorded yet."
              : "No activity matches the selected filters."}
          </p>
        ) : (
          <ol className="space-y-4">
            {filteredActivity.map((event) => {
              const metadata =
                (event.metadata as { emailLogId?: string } | null) ?? null;
              return (
                <li
                  key={event.id}
                  className="rounded-xl border border-border/50 bg-muted/40 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold">
                      {stripEmailLogTag(event.action)}
                    </p>
                    <span className="text-xs text-muted-foreground">
                      {new Date(event.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {event.actor} &middot; {event.scope}
                  </p>
                  {metadata?.emailLogId ? (
                    <p className="text-xs text-muted-foreground">
                      Notification logged
                    </p>
                  ) : null}
                  <Link
                    href={`/globaladmin/audit/${event.id}`}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    View audit details
                  </Link>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
