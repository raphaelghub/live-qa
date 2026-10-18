import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";

export default function SignupPage() {
  return (
    <main className="signal-shell" style={{ justifyContent: "center" }}>
      <div className="signal-brand">Signal</div>
      <h1 style={{ margin: 0, fontSize: "1.25rem" }}>Create host account</h1>
      <AuthForm mode="signup" nextPath="/host" />
      <p className="signal-sub">
        Already hosting? <Link href="/login">Log in</Link>
      </p>
    </main>
  );
}
