"use client";

import { createPortal } from "react-dom";
import { useState } from "react";
import { Button } from "@/app/components/ui/button";

type ConfirmOptions = {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
};

type DialogState = ConfirmOptions & {
  resolve: (value: boolean) => void;
};

export function useActionConfirmation() {
  const [state, setState] = useState<DialogState | null>(null);
  const isBrowser = typeof document !== "undefined";

  const confirmAction = (options: ConfirmOptions) =>
    new Promise<boolean>((resolve) => {
      setState({ ...options, resolve });
    });

  const closeDialog = (value: boolean) => {
    if (state) {
      state.resolve(value);
      setState(null);
    }
  };

  const ConfirmationDialog = () => {
    if (!isBrowser || !state) return null;
    return createPortal(
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
          <h2 className="text-lg font-semibold">{state.title}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {state.description}
          </p>
          <div className="mt-6 flex justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => closeDialog(false)}
            >
              {state.cancelLabel ?? "Cancel"}
            </Button>
            <Button type="button" onClick={() => closeDialog(true)}>
              {state.confirmLabel ?? "Confirm"}
            </Button>
          </div>
        </div>
      </div>,
      document.body,
    );
  };

  return { confirmAction, ConfirmationDialog };
}
