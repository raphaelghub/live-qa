"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  type AuthState,
  parseE164Phone,
  safeNextPath,
} from "@/lib/host-auth";
import { createClient } from "@/lib/supabase/server";

export type { AuthState };

async function requestOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return "http://localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ??
    (host.includes("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function loginAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const next = safeNextPath(String(formData.get("next") || "/host"));

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { status: "form", error: error.message };

  redirect(next);
}

export async function signupAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const displayName = String(formData.get("display_name") || "").trim();

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName || email.split("@")[0] },
    },
  });
  if (error) return { status: "form", error: error.message };

  if (!data.session) {
    return {
      status: "form",
      error:
        "Account created. Confirm your email (or ask an admin to confirm it), then log in.",
    };
  }

  redirect("/host");
}

export async function googleSignInAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const next = safeNextPath(String(formData.get("next") || "/host"));
  const origin = await requestOrigin();
  const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(next)}`;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });
  if (error || !data.url) {
    return {
      status: "form",
      error:
        error?.message ??
        "Google sign-in is not enabled yet. Ask an admin to turn on the Google provider.",
    };
  }

  redirect(data.url);
}

export async function phoneOtpAction(
  prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const next = safeNextPath(String(formData.get("next") || "/host"));
  const intent = formData.get("intent") === "verify" ? "verify" : "send";
  const phone =
    parseE164Phone(String(formData.get("phone") || "")) ??
    (prev.status === "phone-code-sent" ? prev.phone : null);

  if (!phone) {
    return {
      status: "form",
      error: "Enter a phone number with country code, like +15555550100.",
    };
  }

  const supabase = await createClient();

  if (intent === "send") {
    const { error } = await supabase.auth.signInWithOtp({
      phone,
      options: { data: { display_name: phone } },
    });
    if (error) return { status: "form", error: error.message };
    return { status: "phone-code-sent", phone };
  }

  const token = String(formData.get("token") || "").trim();
  if (!/^\d{6}$/.test(token)) {
    return {
      status: "phone-code-sent",
      phone,
      error: "Enter the 6-digit code from the text message.",
    };
  }

  const { error } = await supabase.auth.verifyOtp({
    phone,
    token,
    type: "sms",
  });
  if (error) return { status: "phone-code-sent", phone, error: error.message };

  redirect(next);
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
