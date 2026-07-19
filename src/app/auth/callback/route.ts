import { NextResponse, type NextRequest } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

function getRedirectPath(request: NextRequest) {
  const next = request.nextUrl.searchParams.get("next");

  if (next?.startsWith("/") && !next.startsWith("//")) {
    return next;
  }

  return "/dashboard";
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const redirectTo = new URL(getRedirectPath(request), requestUrl.origin);

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(redirectTo);
    }
  }

  redirectTo.pathname = "/sign-in";
  redirectTo.searchParams.set("error", "Unable to finish sign in. Please try again.");

  return NextResponse.redirect(redirectTo);
}
