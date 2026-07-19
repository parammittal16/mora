import Link from "next/link";

import { createSupabaseServerClient } from "@/lib/supabase/server";

import { PublishControls } from "./PublishControls";

function getProjectName() {
  return (
    process.env.NEXT_PUBLIC_VERCEL_PROJECT_NAME ||
    process.env.VERCEL_PROJECT_NAME ||
    "mora"
  )
    .replace(/^https?:\/\//, "")
    .replace(/\.vercel\.app$/, "")
    .replace(/[^a-zA-Z0-9-]/g, "")
    .toLowerCase();
}

function getPublicUrl(handle: string) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  return siteUrl ? `${siteUrl}/${handle}` : `https://${getProjectName()}.vercel.app/${handle}`;
}

export default async function PublishPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("handle, is_published")
    .eq("user_id", user?.id ?? "")
    .maybeSingle();

  return (
    <section className="max-w-3xl">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#d95c3b]">
        Publish
      </p>
      <h1 className="mt-3 font-serif text-5xl leading-none tracking-[-0.06em]">
        Prepare your public portfolio
      </h1>
      <p className="mt-5 max-w-2xl leading-7 text-[#1d2b27]/65">
        Keep drafts private while you edit. Publish only when the required profile details and portfolio proof are ready.
      </p>
      <div className="mt-8">
        {profile ? (
          <PublishControls
            handle={profile.handle}
            isPublished={profile.is_published}
            publicPath={`/${profile.handle}`}
            publicUrl={getPublicUrl(profile.handle)}
          />
        ) : (
          <div className="rounded-lg border border-[#1d2b27]/10 bg-white p-6">
            <p className="leading-7 text-[#1d2b27]/65">
              Create your MORA before publishing.
            </p>
            <Link
              href="/dashboard/edit"
              className="mt-5 inline-flex rounded-md bg-[#1d2b27] px-5 py-3 text-sm font-semibold text-white"
            >
              Start editing
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
