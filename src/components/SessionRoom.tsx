"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useActionState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getVoterKey } from "@/lib/voter";
import { askQuestionAction, type AskState } from "@/app/e/actions";
import {
  approveQuestion,
  deleteAnnouncement,
  dismissQuestion,
  highlightQuestion,
  markQuestionAnswered,
  postAnnouncement,
  postPublicReply,
  restoreQuestion,
  setAskingOpen as setAskingOpenAction,
  setModerationEnabled as setModerationEnabledAction,
} from "@/app/host/moderate";
import {
  displayName,
  filterQuestions,
  joinUrl,
  qrCodeUrl,
  relativeTime,
  sortQuestions,
  type Announcement,
  type FilterMode,
  type Question,
  type Reply,
  type Session,
  type SortMode,
} from "@/lib/domain";
import {
  loadLocalPending,
  mergeLocalPending,
  saveLocalPending,
} from "@/lib/pending-local";

const askInitial: AskState = {};

type Role = "host" | "participant" | "wall";
type Chrome = "standalone" | "embedded";

function RelativeTime({ iso }: { iso: string }) {
  const [label, setLabel] = useState("");
  useEffect(() => {
    setLabel(relativeTime(iso));
  }, [iso]);
  return <>{label}</>;
}

export function SessionRoom({
  initialSession,
  initialQuestions,
  initialAnnouncements = [],
  initialReplies = [],
  role,
  chrome = "standalone",
}: {
  initialSession: Session;
  initialQuestions: Question[];
  initialAnnouncements?: Announcement[];
  initialReplies?: Reply[];
  role: Role;
  chrome?: Chrome;
}) {
  const embeddedHost = chrome === "embedded" && role === "host";
  const [session, setSession] = useState(initialSession);
  const [questions, setQuestions] = useState(initialQuestions);
  const [announcements, setAnnouncements] = useState(initialAnnouncements);
  const [replies, setReplies] = useState(initialReplies);
  const [useName, setUseName] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [askState, askAction, askPending] = useActionState(
    askQuestionAction,
    askInitial,
  );
  const [selectedId, setSelectedId] = useState<string | null>(
    initialQuestions.find((q) => q.is_highlighted)?.id ?? null,
  );
  const [myVotes, setMyVotes] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>("popular");
  const [filterMode, setFilterMode] = useState<FilterMode>(
    role === "host" ? "all" : "all",
  );
  const [search, setSearch] = useState("");
  const [shareOpen, setShareOpen] = useState(false);
  const [announceDraft, setAnnounceDraft] = useState("");
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [voterKey, setVoterKey] = useState("");
  const [origin, setOrigin] = useState("http://localhost:3000");

  useEffect(() => {
    setVoterKey(getVoterKey());
    setOrigin(window.location.origin);
    if (role === "participant") {
      const local = loadLocalPending(initialSession.id);
      if (local.length) {
        setQuestions((prev) => mergeLocalPending(prev, local));
      }
    }
  }, [initialSession.id, role]);

  const sorted = useMemo(
    () => sortQuestions(questions, sortMode),
    [questions, sortMode],
  );

  const filtered = useMemo(() => {
    let list = filterQuestions(sorted, filterMode, role, voterKey);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (item) =>
          item.body.toLowerCase().includes(q) ||
          displayName(item).toLowerCase().includes(q),
      );
    }
    return list;
  }, [sorted, filterMode, role, voterKey, search]);

  const questionCount = useMemo(() => {
    if (role === "wall" || role === "participant") {
      return questions.filter(
        (q) => q.status === "live" || q.status === "answered",
      ).length;
    }
    return questions.filter((q) => q.status !== "dismissed").length;
  }, [questions, role]);

  const repliesByQuestion = useMemo(() => {
    const map = new Map<string, Reply[]>();
    for (const r of replies) {
      if (r.is_private && role !== "host") continue;
      const list = map.get(r.question_id) ?? [];
      list.push(r);
      map.set(r.question_id, list);
    }
    return map;
  }, [replies, role]);

  const join = joinUrl(session.code, origin);

  const refreshQuestions = useCallback(async () => {
    const supabase = createClient();
    let query = supabase
      .from("questions")
      .select("*")
      .eq("session_id", session.id);
    if (role !== "host") {
      query = query.in("status", ["live", "answered"]);
    }
    const { data } = await query;
    if (!data) return;
    if (role === "participant") {
      const merged = mergeLocalPending(
        data as Question[],
        loadLocalPending(session.id),
      );
      setQuestions(merged);
      saveLocalPending(
        session.id,
        merged.filter((q) => q.status === "pending"),
      );
    } else {
      setQuestions(data as Question[]);
    }
  }, [session.id, role]);

  const refreshAnnouncements = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("announcements")
      .select("*")
      .eq("session_id", session.id)
      .order("created_at", { ascending: false });
    if (data) setAnnouncements(data as Announcement[]);
  }, [session.id]);

  const refreshReplies = useCallback(async () => {
    const supabase = createClient();
    const ids = questions.map((q) => q.id);
    if (ids.length === 0) {
      setReplies([]);
      return;
    }
    const { data } = await supabase
      .from("replies")
      .select("*")
      .in("question_id", ids);
    if (data) setReplies(data as Reply[]);
  }, [questions]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`session-${session.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "questions",
          filter: `session_id=eq.${session.id}`,
        },
        () => {
          void refreshQuestions();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "sessions",
          filter: `id=eq.${session.id}`,
        },
        (payload) => {
          setSession(payload.new as Session);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "announcements",
          filter: `session_id=eq.${session.id}`,
        },
        () => {
          void refreshAnnouncements();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "replies",
        },
        () => {
          void refreshReplies();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [session.id, refreshQuestions, refreshAnnouncements, refreshReplies]);

  useEffect(() => {
    const key = getVoterKey();
    if (!key || questions.length === 0) return;
    const supabase = createClient();
    void supabase
      .from("votes")
      .select("question_id")
      .eq("voter_key", key)
      .in(
        "question_id",
        questions.map((q) => q.id),
      )
      .then(({ data }) => {
        if (data) {
          setMyVotes(new Set(data.map((row) => row.question_id as string)));
        }
      });
  }, [questions]);

  useEffect(() => {
    if (!askState.ok || !askState.question) return;
    const q = askState.question;
    setQuestions((prev) => {
      const next = mergeLocalPending(prev, [q]);
      if (q.status === "pending") {
        saveLocalPending(
          session.id,
          next.filter((item) => item.status === "pending"),
        );
      }
      return next;
    });
    void refreshQuestions();
  }, [askState, refreshQuestions, session.id]);

  useEffect(() => {
    void refreshReplies();
  }, [refreshReplies]);

  async function toggleVote(questionId: string) {
    const key = getVoterKey();
    if (!key) return;
    const supabase = createClient();
    if (myVotes.has(questionId)) {
      await supabase
        .from("votes")
        .delete()
        .eq("question_id", questionId)
        .eq("voter_key", key);
      setMyVotes((prev) => {
        const next = new Set(prev);
        next.delete(questionId);
        return next;
      });
    } else {
      await supabase.from("votes").insert({
        question_id: questionId,
        voter_key: key,
      });
      setMyVotes((prev) => new Set(prev).add(questionId));
    }
    await refreshQuestions();
  }

  async function runHost(
    label: string,
    fn: () => Promise<void>,
  ) {
    try {
      await fn();
      await refreshQuestions();
      await refreshAnnouncements();
      await refreshReplies();
    } catch (err) {
      setError(err instanceof Error ? err.message : `${label} failed`);
    }
  }

  async function copyShare() {
    await navigator.clipboard.writeText(join);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const latestId = useMemo(() => {
    if (questions.length === 0) return null;
    return [...questions]
      .filter((q) => q.status === "live" || q.status === "answered")
      .sort((a, b) => b.created_at.localeCompare(a.created_at))[0]?.id ?? null;
  }, [questions]);

  if (role === "wall") {
    const wallList = filterQuestions(
      sortQuestions(questions, "popular"),
      "all",
      "wall",
    );
    const highlighted = wallList.find((q) => q.is_highlighted);
    const rest = wallList.filter((q) => !q.is_highlighted);
    const latest = latestId ? rest.find((q) => q.id === latestId) : null;
    const popularRest = rest.filter((q) => q.id !== latest?.id);
    const hostLabel = origin.replace(/^https?:\/\//, "") || "localhost:3000";

    if (wallList.length === 0) {
      return (
        <main className="signal-wall intro">
          <div className="signal-wall-intro-brand">Signal</div>
          <div className="signal-wall-intro-body">
            <div className="signal-wall-intro-copy">
              <p className="signal-wall-intro-greet">Join at</p>
              <p className="signal-wall-intro-host">{hostLabel}</p>
              <p className="signal-wall-intro-code">#{session.code}</p>
              <p className="signal-wall-intro-title">{session.title}</p>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="signal-wall-intro-qr"
              src={qrCodeUrl(join, 420)}
              alt={`QR code for ${session.code}`}
              width={420}
              height={420}
            />
          </div>
        </main>
      );
    }

    return (
      <main className="signal-wall stage">
        <aside className="signal-wall-side">
          <div className="signal-brand dark">Signal</div>
          <p className="signal-wall-title">{session.title}</p>
          <p className="signal-wall-join">
            Join at <strong>{hostLabel}</strong>
          </p>
          <div className="signal-wall-code">#{session.code}</div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="signal-qr"
            src={qrCodeUrl(join, 180)}
            alt={`QR code for ${session.code}`}
            width={180}
            height={180}
          />
          <p className="signal-wall-count">{questionCount} questions</p>
        </aside>
        <div className="signal-wall-stage">
          {highlighted ? (
            <article className="signal-card hot stage-hot">
              <div className="signal-meta">
                <span>
                  {displayName(highlighted)} ·{" "}
                  <RelativeTime iso={highlighted.created_at} />
                </span>
                <span>▲ {highlighted.vote_count}</span>
              </div>
              <p className="signal-q">{highlighted.body}</p>
              {(repliesByQuestion.get(highlighted.id) ?? []).map((r) => (
                <p key={r.id} className="signal-reply">
                  Host · {r.body}
                </p>
              ))}
            </article>
          ) : null}
          {popularRest.map((q) => (
            <article key={q.id} className="signal-card">
              <div className="signal-meta">
                <span>
                  {displayName(q)} · <RelativeTime iso={q.created_at} />
                </span>
                <span>▲ {q.vote_count}</span>
              </div>
              <p className="signal-q">{q.body}</p>
            </article>
          ))}
          {latest ? (
            <>
              <div className="signal-divider">Latest question</div>
              <article className="signal-card latest">
                <div className="signal-meta">
                  <span>
                    {displayName(latest)} ·{" "}
                    <RelativeTime iso={latest.created_at} />
                  </span>
                  <span>▲ {latest.vote_count}</span>
                </div>
                <p className="signal-q">{latest.body}</p>
              </article>
            </>
          ) : null}
        </div>
      </main>
    );
  }

  const hostFilters: { id: FilterMode; label: string }[] = [
    { id: "all", label: "All" },
    { id: "unanswered", label: "Open" },
    { id: "answered", label: "Answered" },
    { id: "pending", label: "Pending" },
    { id: "archive", label: "Archive" },
  ];

  const participantFilters: { id: FilterMode; label: string }[] = [
    { id: "all", label: "All" },
    { id: "unanswered", label: "Open" },
    { id: "answered", label: "Answered" },
  ];

  const filters = role === "host" ? hostFilters : participantFilters;

  return (
    <main className={embeddedHost ? "signal-board" : "signal-shell"}>
      {!embeddedHost ? (
        <div className="signal-row" style={{ justifyContent: "space-between" }}>
          <div className="signal-brand">Signal</div>
          {role === "host" ? (
            <Link href="/host" className="signal-sub">
              All sessions
            </Link>
          ) : (
            <Link href="/" className="signal-sub">
              Leave
            </Link>
          )}
        </div>
      ) : null}

      {!embeddedHost ? (
        <>
          <div className="signal-row" style={{ justifyContent: "space-between" }}>
            <h1 style={{ margin: 0, fontSize: "1.2rem" }}>{session.title}</h1>
            <span className="signal-count">{questionCount} questions</span>
          </div>
          <p className="signal-sub">
            {role === "host"
              ? "Moderate, highlight, reply, and present."
              : "Ask anonymously. Upvote what matters."}
          </p>
        </>
      ) : (
        <div className="signal-row" style={{ justifyContent: "flex-end" }}>
          <span className="signal-count">{questionCount} questions</span>
        </div>
      )}

      {announcements[0] ? (
        <div className="signal-announce">
          <strong>Announcement</strong>
          <p>{announcements[0].body}</p>
          {role === "host" ? (
            <button
              className="signal-btn ghost"
              type="button"
              onClick={() =>
                void runHost("Delete announcement", () =>
                  deleteAnnouncement(session.code, announcements[0].id),
                )
              }
            >
              Clear
            </button>
          ) : null}
        </div>
      ) : null}

      {!embeddedHost ? (
        <div className="signal-join">
          <span>#</span>
          <input value={session.code} readOnly />
          {role === "host" ? (
            <button
              className="signal-btn"
              type="button"
              onClick={() => setShareOpen((v) => !v)}
            >
              Share
            </button>
          ) : null}
        </div>
      ) : null}

      {!embeddedHost && role === "host" && shareOpen ? (
        <div className="signal-share">
          <p className="signal-sub">Join link</p>
          <code>{join}</code>
          <div className="signal-row">
            <button className="signal-btn" type="button" onClick={() => void copyShare()}>
              {copied ? "Copied" : "Copy link"}
            </button>
            <a className="signal-btn ghost" href={`/api/export/${session.code}`}>
              Export CSV
            </a>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="signal-qr"
            src={qrCodeUrl(join, 160)}
            alt={`QR for ${session.code}`}
            width={160}
            height={160}
          />
        </div>
      ) : null}

      {role === "host" ? (
        <div className="signal-row">
          <Link className="signal-btn ghost" href={`/e/${session.code}`}>
            Participant view
          </Link>
          {!embeddedHost ? (
            <Link className="signal-btn ghost" href={`/wall/${session.code}`}>
              Present wall
            </Link>
          ) : null}
          {session.asking_open ? (
            <button
              className="signal-btn danger"
              type="button"
              onClick={() =>
                void runHost("Close asking", async () => {
                  await setAskingOpenAction(session.code, false);
                  setSession((prev) => ({ ...prev, asking_open: false }));
                })
              }
            >
              Close asking
            </button>
          ) : (
            <button
              className="signal-btn ghost"
              type="button"
              onClick={() =>
                void runHost("Reopen asking", async () => {
                  await setAskingOpenAction(session.code, true);
                  setSession((prev) => ({ ...prev, asking_open: true }));
                })
              }
            >
              Reopen asking
            </button>
          )}
          <button
            className="signal-btn ghost"
            type="button"
            onClick={() =>
              void runHost("Toggle moderation", async () => {
                const next = !session.moderation_enabled;
                await setModerationEnabledAction(session.code, next);
                setSession((prev) => ({
                  ...prev,
                  moderation_enabled: next,
                }));
              })
            }
          >
            Moderation {session.moderation_enabled ? "on" : "off"}
          </button>
        </div>
      ) : null}

      {role === "host" ? (
        <form
          className="signal-row"
          onSubmit={(ev) => {
            ev.preventDefault();
            const body = announceDraft.trim();
            if (!body) return;
            void runHost("Post announcement", async () => {
              await postAnnouncement(session.code, body);
              setAnnounceDraft("");
            });
          }}
        >
          <input
            className="signal-input"
            value={announceDraft}
            onChange={(ev) => setAnnounceDraft(ev.target.value)}
            placeholder="Post an announcement"
          />
          <button className="signal-btn" type="submit">
            Announce
          </button>
        </form>
      ) : null}

      {!session.asking_open ? (
        <div className="signal-locked">Questions closed for new asks</div>
      ) : null}

      <div className="signal-toolbar">
        <div className="signal-row">
          <button
            className={`signal-chip${sortMode === "popular" ? " on" : ""}`}
            type="button"
            onClick={() => setSortMode("popular")}
          >
            Popular
          </button>
          <button
            className={`signal-chip${sortMode === "recent" ? " on" : ""}`}
            type="button"
            onClick={() => setSortMode("recent")}
          >
            Recent
          </button>
        </div>
        <div className="signal-row">
          {filters.map((f) => (
            <button
              key={f.id}
              className={`signal-chip${filterMode === f.id ? " on" : ""}`}
              type="button"
              onClick={() => setFilterMode(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
        {role === "host" ? (
          <input
            className="signal-input"
            value={search}
            onChange={(ev) => setSearch(ev.target.value)}
            placeholder="Search questions"
          />
        ) : null}
      </div>

      <div style={{ display: "grid", gap: "0.65rem", flex: 1 }}>
        {filtered.length === 0 ? (
          <p className="signal-sub">No questions yet.</p>
        ) : (
          filtered.map((q) => {
            const selected = selectedId === q.id || q.is_highlighted;
            const qReplies = repliesByQuestion.get(q.id) ?? [];
            return (
              <article
                key={q.id}
                className={`signal-card${q.is_highlighted ? " hot" : ""}`}
                onClick={() => role === "host" && setSelectedId(q.id)}
                style={
                  role === "host"
                    ? {
                        cursor: "pointer",
                        outline:
                          selected && !q.is_highlighted
                            ? "1px solid #7dffb355"
                            : undefined,
                      }
                    : undefined
                }
              >
                <div className="signal-meta">
                  <span>
                    {displayName(q)} · <RelativeTime iso={q.created_at} />
                    {q.status === "pending" ? " · in review" : ""}
                    {q.status === "answered" ? " · answered" : ""}
                    {q.status === "dismissed" ? " · dismissed" : ""}
                  </span>
                </div>
                <p className="signal-q">{q.body}</p>
                {qReplies.map((r) => (
                  <p key={r.id} className="signal-reply">
                    Host · {r.body}
                  </p>
                ))}
                {q.status !== "pending" ? (
                  <button
                    className="signal-vote"
                    type="button"
                    disabled={role === "host" || !session.asking_open}
                    onClick={(ev) => {
                      ev.stopPropagation();
                      if (role === "participant") void toggleVote(q.id);
                    }}
                  >
                    {myVotes.has(q.id) ? "▼" : "▲"} {q.vote_count}
                  </button>
                ) : null}
                {role === "host" && selected ? (
                  <div
                    className="signal-row"
                    style={{ marginTop: "0.75rem" }}
                    onClick={(ev) => ev.stopPropagation()}
                  >
                    {q.status === "pending" ? (
                      <>
                        <button
                          className="signal-btn"
                          type="button"
                          onClick={() =>
                            void runHost("Approve", () =>
                              approveQuestion(session.code, q.id),
                            )
                          }
                        >
                          Approve
                        </button>
                        <button
                          className="signal-btn danger"
                          type="button"
                          onClick={() =>
                            void runHost("Dismiss", () =>
                              dismissQuestion(session.code, q.id),
                            )
                          }
                        >
                          Dismiss
                        </button>
                      </>
                    ) : null}
                    {q.status === "live" ? (
                      <>
                        <button
                          className="signal-btn"
                          type="button"
                          onClick={() =>
                            void runHost("Highlight", async () => {
                              await highlightQuestion(session.code, q.id);
                              setSelectedId(q.id);
                            })
                          }
                        >
                          Highlight
                        </button>
                        <button
                          className="signal-btn ghost"
                          type="button"
                          onClick={() =>
                            void runHost("Archive", async () => {
                              await markQuestionAnswered(session.code, q.id);
                              if (selectedId === q.id) setSelectedId(null);
                            })
                          }
                        >
                          Send to archive
                        </button>
                      </>
                    ) : null}
                    {q.status === "answered" || q.status === "dismissed" ? (
                      <button
                        className="signal-btn"
                        type="button"
                        onClick={() =>
                          void runHost("Restore", () =>
                            restoreQuestion(session.code, q.id),
                          )
                        }
                      >
                        Restore
                      </button>
                    ) : null}
                    {q.status === "live" || q.status === "answered" ? (
                      <form
                        className="signal-reply-form"
                        onSubmit={(ev) => {
                          ev.preventDefault();
                          const body = (replyDrafts[q.id] ?? "").trim();
                          if (!body) return;
                          void runHost("Reply", async () => {
                            await postPublicReply(session.code, q.id, body);
                            setReplyDrafts((prev) => ({
                              ...prev,
                              [q.id]: "",
                            }));
                          });
                        }}
                      >
                        <input
                          className="signal-input"
                          value={replyDrafts[q.id] ?? ""}
                          onChange={(ev) =>
                            setReplyDrafts((prev) => ({
                              ...prev,
                              [q.id]: ev.target.value,
                            }))
                          }
                          placeholder="Public reply"
                        />
                        <button className="signal-btn ghost" type="submit">
                          Reply
                        </button>
                      </form>
                    ) : null}
                  </div>
                ) : null}
              </article>
            );
          })
        )}
      </div>

      {role === "participant" ? (
        <form
          action={askAction}
          style={{ display: "grid", gap: "0.5rem", marginTop: "auto" }}
        >
          <input type="hidden" name="code" value={session.code} />
          <input type="hidden" name="use_name" value={useName ? "1" : "0"} />
          <input type="hidden" name="voter_key" value={voterKey} />
          <textarea
            className="signal-textarea"
            name="body"
            placeholder="Ask a question (anonymous by default)"
            disabled={!session.asking_open}
            required
          />
          {useName ? (
            <input
              className="signal-input"
              name="author_name"
              placeholder="Your name"
            />
          ) : null}
          <div className="signal-row">
            <button
              className="signal-btn"
              type="submit"
              disabled={!session.asking_open || askPending}
            >
              {askPending
                ? "Sending…"
                : useName
                  ? "Ask with name"
                  : "Ask anonymously"}
            </button>
            <button
              className="signal-btn ghost"
              type="button"
              onClick={() => setUseName((v) => !v)}
            >
              {useName ? "Stay anonymous" : "Use my name"}
            </button>
          </div>
          {askState.error ? (
            <p className="signal-error">{askState.error}</p>
          ) : null}
          {error ? <p className="signal-error">{error}</p> : null}
        </form>
      ) : null}

      {role === "host" && error ? <p className="signal-error">{error}</p> : null}
    </main>
  );
}
