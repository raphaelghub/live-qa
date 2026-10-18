import type { Question } from "@/lib/domain";

function storageKey(sessionId: string) {
  return `signal_pending_${sessionId}`;
}

export function loadLocalPending(sessionId: string): Question[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(storageKey(sessionId));
    if (!raw) return [];
    return JSON.parse(raw) as Question[];
  } catch {
    return [];
  }
}

export function saveLocalPending(sessionId: string, questions: Question[]) {
  if (typeof window === "undefined") return;
  const pending = questions.filter((q) => q.status === "pending");
  if (pending.length === 0) {
    sessionStorage.removeItem(storageKey(sessionId));
    return;
  }
  sessionStorage.setItem(storageKey(sessionId), JSON.stringify(pending));
}

export function mergeLocalPending(
  remote: Question[],
  local: Question[],
): Question[] {
  const byId = new Map(remote.map((q) => [q.id, q]));
  for (const q of local) {
    if (!byId.has(q.id) && q.status === "pending") {
      byId.set(q.id, q);
    }
  }
  return [...byId.values()];
}
