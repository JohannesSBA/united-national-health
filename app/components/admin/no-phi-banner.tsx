import { ShieldAlert } from "lucide-react";

export function NoPhiBanner() {
  return (
    <div className="w-full bg-amber-100/80 p-3 text-sm text-amber-900">
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 text-center">
        <ShieldAlert className="size-4 shrink-0" aria-hidden="true" />
        <span className="font-semibold">No PHI Allowed:</span>
        <p className="text-xs sm:text-sm">
          This console is restricted to governance, compliance, and platform
          oversight. Never collect, display, or export patient information here.
        </p>
      </div>
    </div>
  );
}
