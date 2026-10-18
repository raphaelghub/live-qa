"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type CreateState = { error?: string };

export async function createSessionAction(
  _prev: CreateState,
  formData: FormData,
): Promise<CreateState> {
  const title = String(formData.get("title") || "Q&A").trim() || "Q&A";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase.rpc("create_session", {
    p_title: title,
  });
  if (error) return { error: error.message };

  const session = Array.isArray(data) ? data[0] : data;
  if (!session?.code) return { error: "No session code returned" };

  redirect(`/host/${session.code}`);
}
