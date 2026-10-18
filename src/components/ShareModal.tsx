"use client";

import { useEffect, useState } from "react";
import { qrCodeUrl } from "@/lib/domain";

export function ShareModal({
  open,
  onClose,
  code,
  join,
}: {
  open: boolean;
  onClose: () => void;
  code: string;
  join: string;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKey(ev: KeyboardEvent) {
      if (ev.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const qr = qrCodeUrl(join, 180);

  async function copyJoin() {
    await navigator.clipboard.writeText(join);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div
      className="signal-modal-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="signal-modal signal-modal-share"
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-modal-title"
        onClick={(ev) => ev.stopPropagation()}
      >
        <div className="signal-modal-head">
          <div
            className="signal-share-tabs"
            role="tablist"
            aria-label="Share"
          >
            <button
              id="share-modal-title"
              className="signal-share-tab on"
              type="button"
              role="tab"
              aria-selected="true"
            >
              Share with participants
            </button>
          </div>
          <button
            className="signal-icon-btn"
            type="button"
            aria-label="Close"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="signal-share-row">
          <div>
            <h3 className="signal-share-heading">Joining link</h3>
            <code>{join}</code>
          </div>
          <button
            className="signal-btn ghost"
            type="button"
            onClick={() => void copyJoin()}
          >
            {copied ? "Copied" : "Copy joining link"}
          </button>
        </div>

        <div className="signal-share-row">
          <div>
            <h3 className="signal-share-heading">QR code</h3>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="signal-qr"
              src={qr}
              alt={`QR code for ${code}`}
              width={180}
              height={180}
            />
          </div>
          <div className="signal-share-actions">
            <a
              className="signal-btn ghost"
              href={qr}
              download={`signal-${code}-qr.png`}
              target="_blank"
              rel="noreferrer"
            >
              Download QR
            </a>
            <a className="signal-btn ghost" href={`/api/export/${code}`}>
              Export CSV
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
