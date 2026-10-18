import assert from "node:assert/strict";
import { test } from "node:test";
import {
  countSessionsByTab,
  duplicateSessionTitle,
  filterSessionsByTab,
  partitionSessionsForAllTab,
  sessionRowStatus,
} from "./domain.ts";

const active = { ended_at: null };
const past = { ended_at: "2026-10-01T00:00:00.000Z" };

test("tabs split on ended_at, not asking_open", () => {
  const sessions = [active, active, past];
  assert.deepEqual(countSessionsByTab(sessions), {
    all: 3,
    active: 2,
    past: 1,
  });
  assert.equal(filterSessionsByTab(sessions, "all").length, 3);
  assert.equal(filterSessionsByTab(sessions, "active").length, 2);
  assert.equal(filterSessionsByTab(sessions, "past").length, 1);
  assert.equal(sessionRowStatus(active), "active");
  assert.equal(sessionRowStatus(past), "past");
});

test("All tab keeps active rows above the Past divider group", () => {
  const sessions = [past, active, past, active];
  assert.deepEqual(partitionSessionsForAllTab(sessions), {
    active: [active, active],
    past: [past, past],
  });
});

test("empty list is empty on every tab", () => {
  assert.deepEqual(countSessionsByTab([]), { all: 0, active: 0, past: 0 });
  assert.deepEqual(filterSessionsByTab([], "past"), []);
});

test("duplicate titles get a copy suffix without cloning Q&A rows", () => {
  assert.equal(duplicateSessionTitle("Gap close demo"), "Gap close demo (copy)");
  assert.equal(duplicateSessionTitle("   "), "Q&A (copy)");
});
