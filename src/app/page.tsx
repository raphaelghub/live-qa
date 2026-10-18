import Link from "next/link";
import { JoinForm } from "@/components/JoinForm";

export default function HomePage() {
  return (
    <main className="signal-shell" style={{ justifyContent: "center" }}>
      <div className="signal-brand">Signal</div>
      <h1 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 600 }}>
        Live audience Q&A
      </h1>
      <p className="signal-sub">
        Join with a code. Hosts sign in to create a session.
      </p>
      <JoinForm />
      <p className="signal-sub">
        Hosting? <Link href="/login">Log in</Link> or{" "}
        <Link href="/signup">create an account</Link>.
      </p>
    </main>
  );
}
