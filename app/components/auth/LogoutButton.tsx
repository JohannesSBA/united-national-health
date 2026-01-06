"use client";
import { authClient } from "@/lib/auth-client";
import { redirect } from "next/navigation";
import { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type LogoutButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children?: ReactNode;
};

export default function LogoutButton({
  children = "Logout",
  className,
  ...props
}: LogoutButtonProps) {
  return (
    <button
      type="button"
      onClick={() =>
        authClient.signOut({
          fetchOptions: {
            onSuccess: () => {
              redirect("/login");
            },
          },
        })
      }
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-border/70 px-4 py-2 text-sm font-medium text-muted-foreground transition hover:border-destructive/40 hover:text-destructive",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
