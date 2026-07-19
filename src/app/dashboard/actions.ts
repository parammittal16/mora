"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

function createHandleSeed(email?: string) {
  return (
    email
      ?.split("@")[0]
      ?.toLowerCase()
      .replace(/[^a-z0-9_-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^[-_]+|[-_]+$/g, "")
      .slice(0, 20) || "mora"
  );
}

export async function createProfileAction() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/sign-in?next=/dashboard");
  }

  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!existingProfile) {
    const seed = createHandleSeed(user.email);
    const fallback = user.id.replace(/-/g, "").slice(0, 8);

    await supabase.from("profiles").insert({
      user_id: user.id,
      handle: `${seed}-${fallback}`.slice(0, 30),
      name: user.user_metadata?.full_name ?? null,
      avatar_url: user.user_metadata?.avatar_url ?? null,
    });
  }

  revalidatePath("/dashboard");
  redirect("/dashboard/edit");
}
