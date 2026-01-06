"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AdministrativeActivity } from "@/lib/global-admin-data";
import { stripEmailLogTag } from "@/lib/email-log-tag";
import { History, Loader2, Search } from "lucide-react";
import type { ReactNode } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Button } from "@/app/components/ui/button";

export type ActivityLogProps = {
  activity: AdministrativeActivity[];
  actions?: ReactNode;
  totalCount?: number;
  pageSize?: number;
  endpoint?: string;
};

export function ActivityLog({
  activity,
  actions,
  totalCount,
  pageSize = 10,
  endpoint = "/api/globaladmin/audit-logs",
}: ActivityLogProps) {
  const [query, setQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [page, setPage] = useState(1);
  const [results, setResults] = useState(activity);
  const [total, setTotal] = useState(totalCount ?? activity.length);
  const [isPageLoading, setIsPageLoading] = useState(false);

  useEffect(() => {
    setResults(activity);
    setTotal(totalCount ?? activity.length);
    setPage(1);
  }, [activity, totalCount]);

  useEffect(() => {
    if (page === 1) {
      return;
    }
    const controller = new AbortController();
    async function fetchPage() {
      setIsPageLoading(true);
      try {
        const response = await fetch(
          `${endpoint}?page=${page}&pageSize=${pageSize}`,
          { signal: controller.signal },
        );
        if (!response.ok) {
          throw new Error("Unable to load audit logs");
        }
        const payload = await response.json();
        setResults(payload.data ?? []);
        setTotal(payload.meta?.total ?? payload.data.length ?? 0);
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error("Failed to load audit logs", error);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsPageLoading(false);
        }
      }
    }
    fetchPage();
    return () => controller.abort();
  }, [page, pageSize, endpoint]);

  const filteredActivity = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const normalizedDate = selectedDate.trim();

    return results.filter((event) => {
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
  }, [results, query, selectedDate]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const canPrev = page > 1;
  const canNext = page < totalPages;

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
            {total === 0
              ? "No administrative events have been recorded yet."
              : "No activity matches the selected filters."}
          </p>
        ) : (
          <ol className="space-y-4">
            {filteredActivity.map((event) => {
              const metadata =
                (event.metadata as {
                  emailLogId?: string;
                  ipAddress?: string;
                  location?: string;
                  userAgent?: string;
                } | null) ?? null;
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
                    {event.actor} &middot; {event.scope} &middot;{" "}
                    {event.category}
                  </p>
                  {metadata?.emailLogId ? (
                    <p className="text-xs text-muted-foreground">
                      Notification logged
                    </p>
                  ) : null}
                  {metadata?.ipAddress || metadata?.location ? (
                    <p className="text-xs text-muted-foreground">
                      IP: {metadata?.ipAddress ?? "Unknown"}
                      {metadata?.location ? ` · ${metadata.location}` : ""}
                    </p>
                  ) : null}
                  {metadata?.userAgent ? (
                    <p className="text-[11px] text-muted-foreground line-clamp-2">
                      UA: {metadata.userAgent}
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
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <p>
            Page {page} of {totalPages} · {total} event
            {total === 1 ? "" : "s"}
          </p>
          <div className="flex items-center gap-2">
            {isPageLoading ? (
              <span className="inline-flex items-center gap-2 text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Loading…
              </span>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!canPrev || isPageLoading}
              onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!canNext || isPageLoading}
              onClick={() => setPage((prev) => prev + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
