"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function JoinForm({ initial = "" }: { initial?: string }) {
  const router = useRouter();
  const [code, setCode] = useState(initial);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const cleaned = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!cleaned) return;
    router.push(`/e/${cleaned}`);
  }

  return (
    <form className="signal-join" onSubmit={onSubmit}>
      <span>#</span>
      <input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="enter code"
        aria-label="Session code"
        autoCapitalize="characters"
      />
      <button className="signal-btn" type="submit">
        Join
      </button>
    </form>
  );
}
