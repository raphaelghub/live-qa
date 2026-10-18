import assert from "node:assert/strict";
import { test } from "node:test";
import {
  callbackExchangeParams,
  googleProviderError,
  isRedirectStatus,
  oauthErrorMessage,
  parseE164Phone,
  phoneProviderError,
  safeNextPath,
} from "./host-auth.ts";

test("safeNextPath keeps in-app paths and rejects open redirects", () => {
  assert.equal(safeNextPath("/host"), "/host");
  assert.equal(safeNextPath("/host/ABC123"), "/host/ABC123");
  assert.equal(safeNextPath(""), "/host");
  assert.equal(safeNextPath(null), "/host");
  assert.equal(safeNextPath("https://evil.example/phish"), "/host");
  assert.equal(safeNextPath("//evil.example"), "/host");
  assert.equal(safeNextPath("/\\evil"), "/host");
});

test("parseE164Phone accepts compact international numbers", () => {
  assert.equal(parseE164Phone("+15555550100"), "+15555550100");
  assert.equal(parseE164Phone("+1 (555) 555-0100"), "+15555550100");
  assert.equal(parseE164Phone("5555550100"), null);
  assert.equal(parseE164Phone("+1"), null);
  assert.equal(parseE164Phone("not a phone"), null);
});

test("oauthErrorMessage only maps known callback codes", () => {
  assert.equal(
    oauthErrorMessage("oauth"),
    "Google sign-in did not finish. Try again, or use email or phone.",
  );
  assert.equal(oauthErrorMessage("nope"), undefined);
  assert.equal(oauthErrorMessage(null), undefined);
});

test("googleProviderError keeps the live GoTrue disable text and names the secrets", () => {
  assert.match(
    googleProviderError(
      "Unsupported provider: provider is not enabled",
    ),
    /provider is not enabled/,
  );
  assert.match(
    googleProviderError("Unsupported provider: provider is not enabled"),
    /client ID and client secret/,
  );
  assert.equal(
    googleProviderError(""),
    "Google sign-in is not enabled yet. Ask an admin to turn on the Google provider.",
  );
});

test("phoneProviderError keeps the live disable text and names Twilio secrets", () => {
  assert.match(
    phoneProviderError("Unsupported phone provider"),
    /Unsupported phone provider/,
  );
  assert.match(phoneProviderError("Unsupported phone provider"), /Twilio/);
  assert.equal(
    phoneProviderError("phone_provider_disabled"),
    "Unsupported phone provider. Enable Phone in Supabase Auth and paste Twilio Account SID, Auth Token, and sender number.",
  );
  assert.equal(phoneProviderError("rate limit"), "rate limit");
});

test("callbackExchangeParams prefers PKCE code, then email token_hash", () => {
  assert.deepEqual(
    callbackExchangeParams(new URLSearchParams("code=abc&next=/host")),
    { kind: "code", code: "abc" },
  );
  assert.deepEqual(
    callbackExchangeParams(
      new URLSearchParams("token_hash=tok&type=signup&next=/host"),
    ),
    { kind: "token_hash", tokenHash: "tok", type: "signup" },
  );
  assert.deepEqual(
    callbackExchangeParams(new URLSearchParams("error=access_denied")),
    { kind: "none" },
  );
});

test("isRedirectStatus treats authorize 302 as provider-enabled", () => {
  assert.equal(isRedirectStatus(302), true);
  assert.equal(isRedirectStatus(400), false);
});
