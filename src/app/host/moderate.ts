"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function requireHostSession(code: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const { data: session } = await supabase
    .from("sessions")
    .select("*")
    .eq("code", code.toUpperCase())
    .maybeSingle();

  if (!session || session.host_id !== user.id) {
    throw new Error("Not your session");
  }

  return { supabase, session, user };
}

function revalidateSession(code: string) {
  revalidatePath(`/host/${code}`);
  revalidatePath(`/e/${code}`);
  revalidatePath(`/wall/${code}`);
}

export async function highlightQuestion(code: string, questionId: string) {
  const { supabase, session } = await requireHostSession(code);
  await supabase
    .from("questions")
    .update({ is_highlighted: false })
    .eq("session_id", session.id)
    .eq("is_highlighted", true);
  const { error } = await supabase
    .from("questions")
    .update({ is_highlighted: true, status: "live" })
    .eq("id", questionId)
    .eq("session_id", session.id);
  if (error) throw new Error(error.message);
  revalidateSession(code);
}

export async function markQuestionAnswered(code: string, questionId: string) {
  const { supabase, session } = await requireHostSession(code);
  const { error } = await supabase
    .from("questions")
    .update({ status: "answered", is_highlighted: false })
    .eq("id", questionId)
    .eq("session_id", session.id);
  if (error) throw new Error(error.message);
  revalidateSession(code);
}

export async function restoreQuestion(code: string, questionId: string) {
  const { supabase, session } = await requireHostSession(code);
  const { error } = await supabase
    .from("questions")
    .update({ status: "live", is_highlighted: false })
    .eq("id", questionId)
    .eq("session_id", session.id);
  if (error) throw new Error(error.message);
  revalidateSession(code);
}

export async function approveQuestion(code: string, questionId: string) {
  const { supabase, session } = await requireHostSession(code);
  const { error } = await supabase
    .from("questions")
    .update({ status: "live" })
    .eq("id", questionId)
    .eq("session_id", session.id);
  if (error) throw new Error(error.message);
  revalidateSession(code);
}

export async function dismissQuestion(code: string, questionId: string) {
  const { supabase, session } = await requireHostSession(code);
  const { error } = await supabase
    .from("questions")
    .update({ status: "dismissed", is_highlighted: false })
    .eq("id", questionId)
    .eq("session_id", session.id);
  if (error) throw new Error(error.message);
  revalidateSession(code);
}

export async function setAskingOpen(code: string, open: boolean) {
  const { supabase, session } = await requireHostSession(code);
  const { error } = await supabase
    .from("sessions")
    .update({ asking_open: open })
    .eq("id", session.id);
  if (error) throw new Error(error.message);
  revalidateSession(code);
}

export async function setModerationEnabled(code: string, enabled: boolean) {
  const { supabase, session } = await requireHostSession(code);
  const { error } = await supabase
    .from("sessions")
    .update({ moderation_enabled: enabled })
    .eq("id", session.id);
  if (error) throw new Error(error.message);
  revalidateSession(code);
}

export async function postAnnouncement(code: string, body: string) {
  const text = body.trim();
  if (!text) throw new Error("Announcement required");
  const { supabase, session } = await requireHostSession(code);
  const { error } = await supabase.from("announcements").insert({
    session_id: session.id,
    body: text,
  });
  if (error) throw new Error(error.message);
  revalidateSession(code);
}

export async function deleteAnnouncement(code: string, announcementId: string) {
  const { supabase, session } = await requireHostSession(code);
  const { error } = await supabase
    .from("announcements")
    .delete()
    .eq("id", announcementId)
    .eq("session_id", session.id);
  if (error) throw new Error(error.message);
  revalidateSession(code);
}

export async function postPublicReply(
  code: string,
  questionId: string,
  body: string,
) {
  const text = body.trim();
  if (!text) throw new Error("Reply required");
  const { supabase, session, user } = await requireHostSession(code);
  const { data: question } = await supabase
    .from("questions")
    .select("id")
    .eq("id", questionId)
    .eq("session_id", session.id)
    .maybeSingle();
  if (!question) throw new Error("Question not found");
  const { error } = await supabase.from("replies").insert({
    question_id: questionId,
    body: text,
    host_id: user.id,
    is_private: false,
  });
  if (error) throw new Error(error.message);
  revalidateSession(code);
}
