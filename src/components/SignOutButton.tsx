import { signOutAction } from "@/app/auth/actions";

export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <button className="signal-btn ghost" type="submit">
        Sign out
      </button>
    </form>
  );
}
