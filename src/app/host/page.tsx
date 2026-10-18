import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { HostSessionsList } from "@/components/HostSessionsList";
import { SignOutButton } from "@/components/SignOutButton";
import type { Session } from "@/lib/domain";


export default async function HostHomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: sessions } = await supabase
    .from("sessions")
    .select("*")
    .eq("host_id", user.id)
    .order("created_at", { ascending: false });

  const list = (sessions ?? []) as Session[];

  return (
    <main className="host-sessions">
      <div className="host-sessions-bar">
        <div className="signal-brand">Signal</div>
        <SignOutButton />
      </div>
      <HostSessionsList sessions={list} />
    </main>
  );
}
