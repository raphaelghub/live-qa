export type HostAuthChannel = "email" | "phone";

export type AuthState =
  | { status: "form"; error?: string }
  | { status: "phone-code-sent"; phone: string; error?: string };

export const initialAuthState: AuthState = { status: "form" };

export function safeNextPath(raw: string | null | undefined): string {
  const next = (raw ?? "").trim() || "/host";
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("\\")) {
    return "/host";
  }
  return next;
}

export function parseE164Phone(raw: string): string | null {
  const compact = raw.replace(/[\s().-]/g, "");
  if (!/^\+[1-9]\d{7,14}$/.test(compact)) return null;
  return compact;
}

export function oauthErrorMessage(code: string | null | undefined): string | undefined {
  if (code === "oauth") {
    return "Google sign-in did not finish. Try again, or use email or phone.";
  }
  return undefined;
}

export const EMAIL_CONFIRM_PENDING_MESSAGE =
  "Account created. Confirm your email (or ask an admin to confirm it), then log in.";

export function googleProviderError(raw: string | null | undefined): string {
  const text = (raw ?? "").trim();
  if (/provider is not enabled/i.test(text) || /unsupported provider/i.test(text)) {
    return "Unsupported provider: provider is not enabled. Enable Google in Supabase Auth and paste the Google Cloud client ID and client secret.";
  }
  if (text) return text;
  return "Google sign-in is not enabled yet. Ask an admin to turn on the Google provider.";
}

export function phoneProviderError(raw: string | null | undefined): string {
  const text = (raw ?? "").trim();
  if (
    /unsupported phone provider/i.test(text) ||
    /phone_provider_disabled/i.test(text)
  ) {
    return "Unsupported phone provider. Enable Phone in Supabase Auth and paste Twilio Account SID, Auth Token, and sender number.";
  }
  return text || "Phone sign-in is not available yet.";
}

export function isRedirectStatus(status: number): boolean {
  return (
    status === 301 ||
    status === 302 ||
    status === 303 ||
    status === 307 ||
    status === 308
  );
}

export type CallbackExchange =
  | { kind: "code"; code: string }
  | { kind: "token_hash"; tokenHash: string; type: string }
  | { kind: "none" };

export function callbackExchangeParams(
  searchParams: Pick<URLSearchParams, "get">,
): CallbackExchange {
  const code = searchParams.get("code");
  if (code) return { kind: "code", code };
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  if (tokenHash && type) return { kind: "token_hash", tokenHash, type };
  return { kind: "none" };
}
