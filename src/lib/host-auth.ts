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
