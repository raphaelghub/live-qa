import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { questionsToCsv, type Question, type Reply } from "@/lib/domain";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: session } = await supabase
    .from("sessions")
    .select("*")
    .eq("code", code.toUpperCase())
    .maybeSingle();

  if (!session || session.host_id !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: questions } = await supabase
    .from("questions")
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

  const csv = questionsToCsv((questions ?? []) as Question[], replies);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="signal-${session.code}.csv"`,
    },
  });
}
