"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  countSessionsByTab,
  filterSessionsByTab,
  isSessionPast,
  partitionSessionsForAllTab,
  sessionRowStatus,
  type Session,
  type SessionListTab,
} from "@/lib/domain";
import { CreateSessionModal } from "@/components/CreateSessionModal";
import {
  deleteSessionAction,
  duplicateSessionAction,
  endSessionAction,
} from "@/app/host/actions";

const TABS: { id: SessionListTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "active", label: "Active & upcoming" },
  { id: "past", label: "Past" },
];

function CreatedDate({ iso }: { iso: string }) {
  const [label, setLabel] = useState("");

  useEffect(() => {
    setLabel(
      new Date(iso).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
    );
  }, [iso]);

  return <span>{label}</span>;
}

export function HostSessionsList({ sessions }: { sessions: Session[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<SessionListTab>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [menuCode, setMenuCode] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Session | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    document.body.dataset.hostList = "ready";
    return () => {
      delete document.body.dataset.hostList;
    };
  }, []);

  useEffect(() => {
    if (!menuCode) return;
    function onKey(ev: KeyboardEvent) {
      if (ev.key === "Escape") setMenuCode(null);
    }
    function onPointer() {
      setMenuCode(null);
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointer);
    };
  }, [menuCode]);

  const searched = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q),
    );
  }, [sessions, query]);

  const counts = countSessionsByTab(searched);
  const filtered = filterSessionsByTab(searched, tab);
  const grouped =
    tab === "all" ? partitionSessionsForAllTab(filtered) : null;

  function runAction(
    work: () => Promise<{ error?: string }>,
    after?: () => void,
  ) {
    setError(null);
    startTransition(async () => {
      const result = await work();
      if (result.error) {
        setError(result.error);
        return;
      }
      after?.();
      router.refresh();
    });
  }

  const emptyMessage =
    sessions.length === 0
      ? "No sessions yet."
      : searched.length === 0
        ? "No matching sessions."
        : tab === "past"
          ? "No past sessions."
          : tab === "active"
            ? "No active sessions."
            : "No matching sessions.";

  function renderRow(session: Session) {
    return (
      <SessionRow
        key={session.id}
        session={session}
        menuOpen={menuCode === session.code}
        pending={pending}
        onToggleMenu={() =>
          setMenuCode((code) =>
            code === session.code ? null : session.code,
          )
        }
        onEnd={() =>
          runAction(() => endSessionAction(session.code), () =>
            setMenuCode(null),
          )
        }
        onDuplicate={() =>
          runAction(() => duplicateSessionAction(session.code), () =>
            setMenuCode(null),
          )
        }
        onAskDelete={() => {
          setMenuCode(null);
          setPendingDelete(session);
        }}
      />
    );
  }

  return (
    <>
      <div className="host-sessions-toolbar">
        <h1 className="host-sessions-title">My sessions</h1>
        <button
          className="signal-btn"
          type="button"
          data-demo="create-session"
          onClick={() => setCreateOpen(true)}
        >
          + Create session
        </button>
      </div>
      <div className="host-sessions-tabs" role="tablist" aria-label="Session status">
        {TABS.map((item) => {
          const selected = tab === item.id;
          const count =
            item.id === "all"
              ? counts.all
              : item.id === "active"
                ? counts.active
                : counts.past;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={selected}
              className={
                selected
                  ? "host-sessions-tab is-selected"
                  : "host-sessions-tab"
              }
              data-demo={`session-tab-${item.id}`}
              onClick={() => setTab(item.id)}
            >
              {item.label}
              <span className="host-sessions-tab-count">{count}</span>
            </button>
          );
        })}
      </div>
      <input
        className="signal-input"
        type="search"
        value={query}
        onChange={(ev) => setQuery(ev.target.value)}
        placeholder="Search by name or code"
        aria-label="Search by name or code"
      />
      {error ? <p className="signal-error">{error}</p> : null}
      <div className="host-sessions-list">
        {filtered.length === 0 ? (
          <p className="signal-sub">{emptyMessage}</p>
        ) : grouped ? (
          <>
            {grouped.active.map(renderRow)}
            {grouped.past.length > 0 ? (
              <p className="host-sessions-divider">Past</p>
            ) : null}
            {grouped.past.map(renderRow)}
          </>
        ) : (
          filtered.map(renderRow)
        )}
      </div>
      <CreateSessionModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />
      {pendingDelete ? (
        <div
          className="signal-modal-backdrop"
          role="presentation"
          onClick={() => setPendingDelete(null)}
        >
          <div
            className="signal-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-session-title"
            onClick={(ev) => ev.stopPropagation()}
          >
            <h2 id="delete-session-title">Delete this session?</h2>
            <p className="signal-sub">
              {pendingDelete.title} (#{pendingDelete.code}) will be removed.
              Join and wall links for this code will stop working.
            </p>
            <div className="signal-modal-actions">
              <button
                className="signal-btn ghost"
                type="button"
                onClick={() => setPendingDelete(null)}
              >
                Cancel
              </button>
              <button
                className="signal-btn danger"
                type="button"
                data-demo="confirm-delete"
                disabled={pending}
                onClick={() => {
                  const code = pendingDelete.code;
                  runAction(() => deleteSessionAction(code), () =>
                    setPendingDelete(null),
                  );
                }}
              >
                {pending ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function SessionRow({
  session,
  menuOpen,
  pending,
  onToggleMenu,
  onEnd,
  onDuplicate,
  onAskDelete,
}: {
  session: Session;
  menuOpen: boolean;
  pending: boolean;
  onToggleMenu: () => void;
  onEnd: () => void;
  onDuplicate: () => void;
  onAskDelete: () => void;
}) {
  const status = sessionRowStatus(session);
  const past = isSessionPast(session);

  return (
    <article
      className="signal-card host-session-row"
      data-session-code={session.code}
      data-session-status={status}
    >
      <Link href={`/host/${session.code}`} className="host-session-main">
        <p className="signal-q">{session.title}</p>
        <div className="signal-meta">
          <span>#{session.code}</span>
          <span>
            <CreatedDate iso={session.created_at} />
          </span>
        </div>
      </Link>
      <p
        className={
          status === "active"
            ? "host-session-status is-active"
            : "host-session-status is-past"
        }
      >
        {status === "active" ? "Active now" : "Past"}
      </p>
      <div
        className="host-session-more"
        onPointerDown={(ev) => ev.stopPropagation()}
      >
        <button
          type="button"
          className="host-session-more-btn"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-label={`More actions for ${session.title}`}
          data-demo="session-menu"
          onClick={onToggleMenu}
        >
          …
        </button>
        {menuOpen ? (
          <div className="host-session-menu" role="menu">
            <button
              type="button"
              role="menuitem"
              data-demo="session-duplicate"
              disabled={pending}
              onClick={onDuplicate}
            >
              Duplicate
            </button>
            {past ? null : (
              <button
                type="button"
                role="menuitem"
                data-demo="session-end"
                disabled={pending}
                onClick={onEnd}
              >
                End session
              </button>
            )}
            <button
              type="button"
              role="menuitem"
              className="is-danger"
              data-demo="session-delete"
              disabled={pending}
              onClick={onAskDelete}
            >
              Delete
            </button>
          </div>
        ) : null}
      </div>
    </article>
  );
}
