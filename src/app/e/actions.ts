"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Question } from "@/lib/domain";

export type AskState = { error?: string; ok?: boolean; question?: Question };

export async function askQuestionAction(
  _prev: AskState,
  formData: FormData,
): Promise<AskState> {
  const code = String(formData.get("code") || "")
    .trim()
    .toUpperCase();
  const body = String(formData.get("body") || "").trim();
  const authorName = String(formData.get("author_name") || "").trim();
  const useName = formData.get("use_name") === "1";
  const voterKey = String(formData.get("voter_key") || "").trim() || null;

  if (!code || !body) return { error: "Question required" };

  const supabase = await createClient();
  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .select("*")
    .eq("code", code)
    .maybeSingle();

  if (sessionError || !session) return { error: "Session not found" };
  if (!session.asking_open) return { error: "Asking is closed" };

  const status = session.moderation_enabled ? "pending" : "live";
  const payload = {
    session_id: session.id,
    body,
    is_anonymous: !useName || !authorName,
    author_name: useName ? authorName || null : null,
    status,
    voter_key: voterKey,
  };

  // Pending rows are not SELECT-visible to anonymous clients (RLS).
  // Insert without returning when moderated; synthesize a local card instead.
  if (status === "pending") {
    const id = crypto.randomUUID();
    const { error } = await supabase.from("questions").insert({
      ...payload,
      id,
    });
    if (error) return { error: error.message };
    const question: Question = {
      id,
      session_id: session.id,
      body,
      author_name: payload.author_name,
      is_anonymous: payload.is_anonymous,
      status: "pending",
      is_highlighted: false,
      vote_count: 0,
      voter_key: voterKey,
      created_at: new Date().toISOString(),
    };
    revalidatePath(`/e/${code}`);
    revalidatePath(`/host/${code}`);
    revalidatePath(`/wall/${code}`);
    return { ok: true, question };
  }

  const { data, error } = await supabase
    .from("questions")
    .insert(payload)
    .select("*")
    .single();

  if (error) return { error: error.message };

  revalidatePath(`/e/${code}`);
  revalidatePath(`/host/${code}`);
  revalidatePath(`/wall/${code}`);
  return { ok: true, question: data as Question };
}
