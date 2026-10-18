"use client";

import { useActionState } from "react";
import {
  loginAction,
  signupAction,
  type AuthState,
} from "@/app/auth/actions";

const initial: AuthState = {};

export function AuthForm({
  mode,
  nextPath,
}: {
  mode: "login" | "signup";
  nextPath: string;
}) {
  const action = mode === "signup" ? signupAction : loginAction;
  const [state, formAction, pending] = useActionState(action, initial);

  return (
    <form action={formAction} style={{ display: "grid", gap: "0.75rem", width: "100%" }}>
      <input type="hidden" name="next" value={nextPath} />
      {mode === "signup" ? (
        <input
          className="signal-input"
          name="display_name"
          placeholder="Display name"
          autoComplete="nickname"
        />
      ) : null}
      <input
        className="signal-input"
        type="email"
        name="email"
        placeholder="Email"
        required
        autoComplete="email"
      />
      <input
        className="signal-input"
        type="password"
        name="password"
        placeholder="Password (min 6)"
        required
        minLength={6}
        autoComplete={mode === "signup" ? "new-password" : "current-password"}
      />
      {state.error ? <p className="signal-error">{state.error}</p> : null}
      <button className="signal-btn" type="submit" disabled={pending}>
        {pending ? "Working…" : mode === "signup" ? "Sign up" : "Log in"}
      </button>
    </form>
  );
}
