"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Session } from "@/lib/domain";
import { CreateSessionModal } from "@/components/CreateSessionModal";

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
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    document.body.dataset.hostList = "ready";
    return () => {
      delete document.body.dataset.hostList;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q),
    );
  }, [sessions, query]);

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
      <input
        className="signal-input"
        type="search"
        value={query}
        onChange={(ev) => setQuery(ev.target.value)}
        placeholder="Search by name or code"
        aria-label="Search by name or code"
      />
      <div className="host-sessions-list">
        {filtered.length === 0 ? (
          <p className="signal-sub">
            {sessions.length === 0
              ? "No sessions yet."
              : "No matching sessions."}
          </p>
        ) : (
          filtered.map((s) => (
            <Link
              key={s.id}
              href={`/host/${s.code}`}
              className="signal-card host-session-row"
            >
              <p className="signal-q">{s.title}</p>
              <div className="signal-meta">
                <span>#{s.code}</span>
                <span>
                  <CreatedDate iso={s.created_at} />
                </span>
              </div>
            </Link>
          ))
        )}
      </div>
      <CreateSessionModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />
    </>
  );
}
