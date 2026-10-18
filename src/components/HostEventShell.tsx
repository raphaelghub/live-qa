"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { joinUrl, type Session } from "@/lib/domain";
import { ShareModal } from "@/components/ShareModal";

export type HostView = "interactions" | "qa";

export type HostShellUi = {
  shareOpen: boolean;
  view: HostView;
};

export function HostEventShell({
  session,
  questionCount,
  children,
}: {
  session: Session;
  questionCount: number;
  children: ReactNode;
}) {
  const [origin, setOrigin] = useState("");
  const [shell, setShell] = useState<HostShellUi>({
    shareOpen: false,
    view: questionCount > 0 ? "qa" : "interactions",
  });

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const join = joinUrl(session.code, origin || undefined);
  const qaOpen = shell.view === "qa";

  return (
    <div className="host-event">
      <header className="host-event-top">
        <Link href="/host" className="signal-sub host-back">
          ← Sessions
        </Link>
        <h1 className="host-event-title">{session.title}</h1>
        <span className="host-event-code">#{session.code}</span>
        <div className="host-event-actions">
          <button
            className="signal-btn ghost"
            type="button"
            data-demo="share"
            onClick={() => setShell((prev) => ({ ...prev, shareOpen: true }))}
          >
            Share
          </button>
          <a
            className="signal-btn"
            href={`/wall/${session.code}`}
            target="_blank"
            rel="noreferrer"
            data-demo="present"
          >
            Present
          </a>
        </div>
      </header>

      <div className="host-event-body">
        <nav className="host-event-rail" aria-label="Event">
          <button
            className="host-rail-btn on"
            type="button"
            aria-label="Interactions"
            aria-current={shell.view === "interactions" ? "page" : undefined}
            onClick={() =>
              setShell((prev) => ({ ...prev, view: "interactions" }))
            }
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M5 6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v7A2.5 2.5 0 0 1 16.5 16H10l-3.8 3.2A.6.6 0 0 1 5 18.7V6.5Z"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </nav>

        <aside className="host-event-side">
          <h2 className="host-side-title">My interactions</h2>
          <button
            className={`host-qa-card${qaOpen ? " on" : ""}`}
            type="button"
            data-demo="open-qa"
            onClick={() => setShell((prev) => ({ ...prev, view: "qa" }))}
          >
            <strong>Audience Q&amp;A</strong>
            {questionCount === 0 ? (
              <>
                <p className="signal-sub">
                  Collect questions from your audience. Nothing asked yet.
                </p>
                <span className="signal-btn">Open Q&amp;A</span>
              </>
            ) : (
              <p className="signal-sub">
                {questionCount} question{questionCount === 1 ? "" : "s"}
              </p>
            )}
          </button>
        </aside>

        <section className="host-event-main">
          {shell.view === "interactions" ? (
            <div className="host-pick">
              <p className="signal-sub">
                Open Audience Q&amp;A to run the room.
              </p>
            </div>
          ) : (
            children
          )}
        </section>
      </div>

      <ShareModal
        open={shell.shareOpen}
        onClose={() => setShell((prev) => ({ ...prev, shareOpen: false }))}
        code={session.code}
        join={join}
      />
    </div>
  );
}
