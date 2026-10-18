import assert from "node:assert/strict";
import { test } from "node:test";
import {
  oauthErrorMessage,
  parseE164Phone,
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
