"use client";
import { Button } from "@/components/ui/button";
import { LoginForm } from "../components/auth/LoginForm";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  return (
    <div className="w-screen h-screen flex items-center justify-center">
      <Button
        variant="outline"
        className="flex items-center gap-2 absolute top-4 left-4"
        onClick={() => router.push("/")}
      >
        <ChevronLeft className="size-4" />
        Back
      </Button>
      <LoginForm />
    </div>
  );
}
