"use client";

import { useActionState, useState } from "react";
import {
  googleSignInAction,
  loginAction,
  phoneOtpAction,
  signupAction,
} from "@/app/auth/actions";
import { type HostAuthChannel, initialAuthState } from "@/lib/host-auth";

export function AuthForm({
  mode,
  nextPath,
  oauthError,
}: {
  mode: "login" | "signup";
  nextPath: string;
  oauthError?: string;
}) {
  const [channel, setChannel] = useState<HostAuthChannel>("email");
  const [phoneKey, setPhoneKey] = useState(0);
  const emailAction = mode === "signup" ? signupAction : loginAction;
  const [emailState, emailFormAction, emailPending] = useActionState(
    emailAction,
    initialAuthState,
  );
  const [googleState, googleFormAction, googlePending] = useActionState(
    googleSignInAction,
    initialAuthState,
  );

  const googleError =
    oauthError ||
    (googleState.status === "form" ? googleState.error : undefined);
  const emailError =
    emailState.status === "form" ? emailState.error : undefined;

  return (
    <div className="signal-auth">
      <form action={googleFormAction} className="signal-auth-form">
        <input type="hidden" name="next" value={nextPath} />
        <button
          className="signal-btn ghost"
          type="submit"
          disabled={googlePending}
        >
          {googlePending ? "Redirecting…" : "Continue with Google"}
        </button>
        {googleError ? <p className="signal-error">{googleError}</p> : null}
      </form>

      <p className="signal-auth-divider">or</p>

      <div className="signal-auth-tabs" role="tablist" aria-label="Sign-in method">
        <button
          className="signal-auth-tab"
          type="button"
          role="tab"
          aria-selected={channel === "email"}
          onClick={() => setChannel("email")}
        >
          Email
        </button>
        <button
          className="signal-auth-tab"
          type="button"
          role="tab"
          aria-selected={channel === "phone"}
          onClick={() => setChannel("phone")}
        >
          Phone
        </button>
      </div>

      {channel === "phone" ? (
        <PhoneAuthForm
          key={phoneKey}
          nextPath={nextPath}
          mode={mode}
          onChangeNumber={() => setPhoneKey((n) => n + 1)}
        />
      ) : (
        <form action={emailFormAction} className="signal-auth-form">
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
          {emailError ? <p className="signal-error">{emailError}</p> : null}
          <button className="signal-btn" type="submit" disabled={emailPending}>
            {emailPending
              ? "Working…"
              : mode === "signup"
                ? "Sign up"
                : "Log in"}
          </button>
        </form>
      )}

    </div>
  );
}

function PhoneAuthForm({
  nextPath,
  mode,
  onChangeNumber,
}: {
  nextPath: string;
  mode: "login" | "signup";
  onChangeNumber: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    phoneOtpAction,
    initialAuthState,
  );

  if (state.status === "phone-code-sent") {
    return (
      <form action={formAction} className="signal-auth-form">
        <input type="hidden" name="next" value={nextPath} />
        <input type="hidden" name="intent" value="verify" />
        <input type="hidden" name="phone" value={state.phone} />
        <p className="signal-sub">
          Code sent to {state.phone}. It expires in about a minute.
        </p>
        <input
          className="signal-input"
          name="token"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="6-digit code"
          required
          minLength={6}
          maxLength={6}
          pattern="\d{6}"
        />
        {state.error ? <p className="signal-error">{state.error}</p> : null}
        <button className="signal-btn" type="submit" disabled={pending}>
          {pending
            ? "Verifying…"
            : mode === "signup"
              ? "Verify and create account"
              : "Verify and log in"}
        </button>
        <button
          className="signal-btn ghost"
          type="button"
          onClick={onChangeNumber}
        >
          Use a different number
        </button>
      </form>
    );
  }

  return (
    <form action={formAction} className="signal-auth-form">
      <input type="hidden" name="next" value={nextPath} />
      <input type="hidden" name="intent" value="send" />
      <input
        className="signal-input"
        name="phone"
        type="tel"
        autoComplete="tel"
        placeholder="+1 555 555 0100"
        required
      />
      {state.error ? <p className="signal-error">{state.error}</p> : null}
      <button className="signal-btn" type="submit" disabled={pending}>
        {pending ? "Sending…" : "Send code"}
      </button>
    </form>
  );
}
