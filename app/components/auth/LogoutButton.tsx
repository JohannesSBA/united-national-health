"use client";
import { authClient } from "@/lib/auth-client";
import { redirect } from "next/navigation";

export default function LogoutButton() {
  return (
    <button
      onClick={() =>
        authClient.signOut({
          fetchOptions: {
            onSuccess: () => {
              redirect("/login");
            },
          },
        })
      }
    >
      Logout
    </button>
  );
}
