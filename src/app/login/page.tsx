import Link from "next/link";
import { Suspense } from "react";
import { AuthForm } from "@/components/AuthForm";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <main className="signal-shell" style={{ justifyContent: "center" }}>
      <div className="signal-brand">Signal</div>
      <h1 style={{ margin: 0, fontSize: "1.25rem" }}>Host login</h1>
      <Suspense fallback={<AuthForm mode="login" nextPath="/host" />}>
        <LoginForm />
      </Suspense>
      <p className="signal-sub">
        No account? <Link href="/signup">Sign up</Link>
      </p>
    </main>
  );
}
