import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { HostEventShell } from "@/components/HostEventShell";
import { SessionRoom } from "@/components/SessionRoom";
import type { Announcement, Question, Reply, Session } from "@/lib/domain";


export default async function HostSessionPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: session } = await supabase
    .from("sessions")
    .select("*")
    .eq("code", code.toUpperCase())
    .maybeSingle();

  if (!session || session.host_id !== user.id) notFound();

  const { data: questions } = await supabase
    .from("questions")
    .select("*")
    .eq("session_id", session.id)
    .order("created_at", { ascending: false });

  const { data: announcements } = await supabase
    .from("announcements")
    .select("*")
    .eq("session_id", session.id)
    .order("created_at", { ascending: false });

  const ids = (questions ?? []).map((q) => q.id);
  let replies: Reply[] = [];
  if (ids.length > 0) {
    const { data } = await supabase
      .from("replies")
      .select("*")
      .in("question_id", ids);
    replies = (data ?? []) as Reply[];
  }

  const room = session as Session;
  const qs = (questions ?? []) as Question[];

  return (
    <HostEventShell session={room} questionCount={qs.length}>
      <SessionRoom
        role="host"
        chrome="embedded"
        initialSession={room}
        initialQuestions={qs}
        initialAnnouncements={(announcements ?? []) as Announcement[]}
        initialReplies={replies}
      />
    </HostEventShell>
  );
}
