"use client";

import { useTransition } from "react";
import { Button } from "@/app/components/ui/button";

export function AnalyticsExportButton() {
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    startTransition(async () => {
      const response = await fetch("/api/globaladmin/analytics/export");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "governance-report.csv";
      anchor.click();
      URL.revokeObjectURL(url);
    });
  };

  return (
    <Button type="button" size="sm" onClick={handleClick} disabled={isPending}>
      {isPending ? "Exporting..." : "Export governance report"}
    </Button>
  );
}
