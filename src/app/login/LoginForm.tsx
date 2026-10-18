"use client";

import { useSearchParams } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";

export function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/host";
  return <AuthForm mode="login" nextPath={next} />;
}
