"use client";

import { useSearchParams } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { oauthErrorMessage, safeNextPath } from "@/lib/host-auth";

export function LoginForm() {
  const searchParams = useSearchParams();
  const next = safeNextPath(searchParams.get("next"));
  return (
    <AuthForm
      mode="login"
      nextPath={next}
      oauthError={oauthErrorMessage(searchParams.get("error"))}
    />
  );
}
