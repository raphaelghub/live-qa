import Link from "next/link";

export default function NotFound() {
  return (
    <main className="signal-shell" style={{ justifyContent: "center" }}>
      <div className="signal-brand">Signal</div>
      <h1 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 600 }}>
        Session not found
      </h1>
      <p className="signal-sub">
        This code is not an open session. It may be mistyped, or the host
        deleted it.
      </p>
      <p className="signal-sub">
        <Link href="/">Join another session</Link>
      </p>
    </main>
  );
}
