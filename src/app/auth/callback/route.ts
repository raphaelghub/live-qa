import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { callbackExchangeParams, safeNextPath } from "@/lib/host-auth";
import { createClient } from "@/lib/supabase/server";

function successRedirect(request: Request, origin: string, next: string) {
  const forwardedHost = request.headers.get("x-forwarded-host");
  if (process.env.NODE_ENV === "development") {
    return NextResponse.redirect(`${origin}${next}`);
  }
  if (forwardedHost) {
    return NextResponse.redirect(`https://${forwardedHost}${next}`);
  }
  return NextResponse.redirect(`${origin}${next}`);
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const next = safeNextPath(searchParams.get("next"));
  const exchange = callbackExchangeParams(searchParams);

  if (exchange.kind !== "none") {
    const supabase = await createClient();
    const { error } =
      exchange.kind === "code"
        ? await supabase.auth.exchangeCodeForSession(exchange.code)
        : await supabase.auth.verifyOtp({
            token_hash: exchange.tokenHash,
            type: exchange.type as EmailOtpType,
          });
    if (!error) return successRedirect(request, origin, next);
  }

  const fail = new URL("/login", origin);
  fail.searchParams.set("error", "oauth");
  return NextResponse.redirect(fail);
}
