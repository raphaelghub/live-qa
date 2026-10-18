export type QuestionStatus = "pending" | "live" | "answered" | "dismissed";

export type SortMode = "popular" | "recent";
export type FilterMode = "all" | "unanswered" | "answered" | "pending" | "archive";

export type Session = {
  id: string;
  host_id: string;
  code: string;
  title: string;
  asking_open: boolean;
  moderation_enabled: boolean;
  created_at: string;
};

export type Question = {
  id: string;
  session_id: string;
  body: string;
  author_name: string | null;
  is_anonymous: boolean;
  status: QuestionStatus;
  is_highlighted: boolean;
  vote_count: number;
  voter_key: string | null;
  created_at: string;
};

export type Announcement = {
  id: string;
  session_id: string;
  body: string;
  created_at: string;
};

export type Reply = {
  id: string;
  question_id: string;
  body: string;
  host_id: string | null;
  is_private: boolean;
  created_at: string;
};

export function sortQuestions(
  questions: Question[],
  mode: SortMode = "popular",
): Question[] {
  return [...questions].sort((a, b) => {
    if (a.is_highlighted !== b.is_highlighted) {
      return a.is_highlighted ? -1 : 1;
    }
    if (mode === "recent") {
      return b.created_at.localeCompare(a.created_at);
    }
    if (b.vote_count !== a.vote_count) {
      return b.vote_count - a.vote_count;
    }
    return b.created_at.localeCompare(a.created_at);
  });
}

export function filterQuestions(
  questions: Question[],
  mode: FilterMode,
  role: "host" | "participant" | "wall",
  myVoterKey?: string,
): Question[] {
  return questions.filter((q) => {
    if (role === "wall") {
      return q.status === "live" || q.status === "answered";
    }
    if (role === "participant") {
      if (q.status === "pending") {
        return Boolean(myVoterKey && q.voter_key === myVoterKey);
      }
      if (mode === "answered") return q.status === "answered";
      if (mode === "unanswered") return q.status === "live";
      return q.status === "live" || q.status === "answered";
    }
    // host
    if (mode === "pending") return q.status === "pending";
    if (mode === "archive") {
      return q.status === "answered" || q.status === "dismissed";
    }
    if (mode === "answered") return q.status === "answered";
    if (mode === "unanswered") {
      return q.status === "live" || q.status === "pending";
    }
    return q.status !== "dismissed";
  });
}

export function displayName(q: Question): string {
  if (q.is_anonymous || !q.author_name) return "Anonymous";
  return q.author_name;
}

export function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export function joinUrl(code: string, origin?: string): string {
  const base =
    origin ||
    (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");
  return `${base}/e/${code}`;
}

export function qrCodeUrl(data: string, size = 160): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`;
}

export function questionsToCsv(
  questions: Question[],
  replies: Reply[] = [],
): string {
  const replyMap = new Map<string, string[]>();
  for (const r of replies) {
    if (r.is_private) continue;
    const list = replyMap.get(r.question_id) ?? [];
    list.push(r.body.replace(/\s+/g, " ").trim());
    replyMap.set(r.question_id, list);
  }

  const header = [
    "id",
    "status",
    "highlighted",
    "votes",
    "anonymous",
    "author",
    "body",
    "created_at",
    "replies",
  ];
  const rows = questions.map((q) =>
    [
      q.id,
      q.status,
      q.is_highlighted ? "yes" : "no",
      String(q.vote_count),
      q.is_anonymous ? "yes" : "no",
      csvEscape(displayName(q)),
      csvEscape(q.body),
      q.created_at,
      csvEscape((replyMap.get(q.id) ?? []).join(" | ")),
    ].join(","),
  );
  return [header.join(","), ...rows].join("\n");
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}
