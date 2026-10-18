"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { duplicateSessionTitle } from "@/lib/domain";
import { createClient } from "@/lib/supabase/server";

export type CreateState = { error?: string };
export type SessionActionState = { error?: string };

async function requireHost() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

function revalidateHostList(code: string) {
  revalidatePath("/host");
  revalidatePath(`/host/${code}`);
  revalidatePath(`/e/${code}`);
  revalidatePath(`/wall/${code}`);
}

export async function createSessionAction(
  _prev: CreateState,
  formData: FormData,
): Promise<CreateState> {
  const title = String(formData.get("title") || "Q&A").trim() || "Q&A";
  const { supabase } = await requireHost();

  const { data, error } = await supabase.rpc("create_session", {
    p_title: title,
  });
  if (error) return { error: error.message };

  const session = Array.isArray(data) ? data[0] : data;
  if (!session?.code) return { error: "No session code returned" };

  redirect(`/host/${session.code}`);
}

export async function endSessionAction(
  code: string,
): Promise<SessionActionState> {
  const { supabase } = await requireHost();
  const { error } = await supabase.rpc("end_session", { p_code: code });
  if (error) return { error: error.message };
  revalidateHostList(code);
  return {};
}

export async function deleteSessionAction(
  code: string,
): Promise<SessionActionState> {
  const { supabase } = await requireHost();
  const { error } = await supabase.rpc("delete_session", { p_code: code });
  if (error && !/not found/i.test(error.message)) {
    return { error: error.message };
  }
  revalidateHostList(code);
  return {};
}

export async function duplicateSessionAction(
  code: string,
): Promise<SessionActionState> {
  const { supabase, user } = await requireHost();
  const { data: source, error: loadError } = await supabase
    .from("sessions")
    .select("title, moderation_enabled, host_id")
    .eq("code", code.toUpperCase())
    .maybeSingle();
  if (loadError) return { error: loadError.message };
  if (!source) return { error: "Not found" };
  if (source.host_id !== user.id) return { error: "Not your session" };

  const { data, error } = await supabase.rpc("create_session", {
    p_title: duplicateSessionTitle(source.title),
  });
  if (error) return { error: error.message };

  const created = Array.isArray(data) ? data[0] : data;
  if (!created?.code) return { error: "No session code returned" };

  if (source.moderation_enabled) {
    const { error: updateError } = await supabase
      .from("sessions")
      .update({ moderation_enabled: true })
      .eq("id", created.id);
    if (updateError) return { error: updateError.message };
  }

  revalidatePath("/host");
  return {};
}
