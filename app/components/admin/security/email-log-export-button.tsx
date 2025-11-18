"use client";

import { useState, useTransition } from "react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";

type FiltersState = {
  recipient: string;
  start: string;
  end: string;
  limit: string;
  page: string;
};

type EmailLogExportButtonProps = {
  defaultFilters?: Partial<FiltersState>;
  lockRecipient?: boolean;
};

const DEFAULT_FILTERS: FiltersState = {
  recipient: "",
  start: "",
  end: "",
  limit: "250",
  page: "1",
};

export function EmailLogExportButton({
  defaultFilters,
  lockRecipient = false,
}: EmailLogExportButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [filters, setFilters] = useState<FiltersState>({
    ...DEFAULT_FILTERS,
    ...(defaultFilters ?? {}),
  });

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleClick = () => {
    startTransition(async () => {
      if (
        !filters.recipient.trim() &&
        !filters.start.trim() &&
        !filters.end.trim()
      ) {
        alert("Select a recipient or date range before downloading.");
        return;
      }
      const params = new URLSearchParams();
      if (filters.recipient.trim()) {
        params.set("recipient", filters.recipient.trim());
      }
      if (filters.start) params.set("start", filters.start);
      if (filters.end) params.set("end", filters.end);
      if (filters.limit) params.set("limit", filters.limit);
      if (filters.page) params.set("page", filters.page);

      const response = await fetch(
        `/api/globaladmin/email-logs/export?${params.toString()}`,
      );
      if (!response.ok) {
        alert("Unable to download email logs. Verify encryption settings.");
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      anchor.download = `email-logs-${timestamp}.html`;
      anchor.click();
      URL.revokeObjectURL(url);
    });
  };

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border/60 px-3 py-2">
      <div className="flex flex-col">
        <label className="text-xs font-medium text-muted-foreground">
          Recipient
        </label>
        <Input
          name="recipient"
          value={filters.recipient}
          onChange={handleChange}
          placeholder="user@example.gov"
          className="h-9"
          disabled={lockRecipient && Boolean(filters.recipient)}
        />
      </div>
      <div className="flex flex-col">
        <label className="text-xs font-medium text-muted-foreground">
          Start date
        </label>
        <Input
          type="date"
          name="start"
          value={filters.start}
          onChange={handleChange}
          className="h-9"
        />
      </div>
      <div className="flex flex-col">
        <label className="text-xs font-medium text-muted-foreground">
          End date
        </label>
        <Input
          type="date"
          name="end"
          value={filters.end}
          onChange={handleChange}
          className="h-9"
        />
      </div>
      <div className="flex flex-col">
        <label className="text-xs font-medium text-muted-foreground">
          Page
        </label>
        <Input
          type="number"
          min={1}
          name="page"
          value={filters.page}
          onChange={handleChange}
          className="h-9"
        />
      </div>
      <div className="flex flex-col">
        <label className="text-xs font-medium text-muted-foreground">
          Limit
        </label>
        <Input
          type="number"
          min={1}
          max={1000}
          name="limit"
          value={filters.limit}
          onChange={handleChange}
          className="h-9"
        />
      </div>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={handleClick}
        disabled={isPending}
      >
        {isPending ? "Preparing emails..." : "Download email log"}
      </Button>
    </div>
  );
}
