"use client";

import { useActionState, useEffect, useState } from "react";
import {
  createSessionAction,
  type CreateState,
} from "@/app/host/actions";

const initial: CreateState = {};

function isoDate(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function CreateSessionModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    createSessionAction,
    initial,
  );
  const [dates, setDates] = useState({ start: "", end: "" });

  useEffect(() => {
    setDates({ start: isoDate(0), end: isoDate(2) });
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(ev: KeyboardEvent) {
      if (ev.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="signal-modal-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="signal-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-session-title"
        onClick={(ev) => ev.stopPropagation()}
      >
        <h2 id="create-session-title">Create your session</h2>
        <form action={formAction} className="signal-modal-form">
          <label className="signal-field">
            <span>Give your session a name</span>
            <input
              className="signal-input"
              name="title"
              placeholder="Session name"
              autoFocus
            />
          </label>
          <div className="signal-dates">
            <label className="signal-field">
              <span>Start date</span>
              <input
                className="signal-input"
                type="date"
                value={dates.start}
                onChange={(ev) =>
                  setDates((prev) => ({ ...prev, start: ev.target.value }))
                }
              />
            </label>
            <label className="signal-field">
              <span>End date</span>
              <input
                className="signal-input"
                type="date"
                value={dates.end}
                onChange={(ev) =>
                  setDates((prev) => ({ ...prev, end: ev.target.value }))
                }
              />
            </label>
          </div>
          <p className="signal-info">
            Anyone with the code or link can participate
          </p>
          {state.error ? <p className="signal-error">{state.error}</p> : null}
          <div className="signal-modal-actions">
            <button
              className="signal-btn ghost"
              type="button"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className="signal-btn"
              type="submit"
              disabled={pending}
              data-demo="create-session-submit"
            >
              {pending ? "Creating…" : "Create session"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
