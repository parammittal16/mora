import { redirect } from "next/navigation";
import { Suspense } from "react";

import { createSupabaseServerClient } from "@/lib/supabase/server";

import { AuthForm } from "../AuthForm";

export default async function SignInPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <Suspense>
      <AuthForm mode="sign-in" />
    </Suspense>
  );
}
