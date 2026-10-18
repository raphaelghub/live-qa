import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SessionRoom } from "@/components/SessionRoom";
import type { Announcement, Question, Reply, Session } from "@/lib/domain";


export default async function WallPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const supabase = await createClient();

  const { data: session } = await supabase
    .from("sessions")
    .select("*")
    .eq("code", code.toUpperCase())
    .maybeSingle();

  if (!session) notFound();

  const { data: questions } = await supabase
    .from("questions")
    .select("*")
    .eq("session_id", session.id)
    .in("status", ["live", "answered"])
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
      .in("question_id", ids)
      .eq("is_private", false);
    replies = (data ?? []) as Reply[];
  }

  return (
    <SessionRoom
      role="wall"
      initialSession={session as Session}
      initialQuestions={(questions ?? []) as Question[]}
      initialAnnouncements={(announcements ?? []) as Announcement[]}
      initialReplies={replies}
    />
  );
}
