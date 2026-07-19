import Link from "next/link";

import { createSupabaseServerClient } from "@/lib/supabase/server";

import { publishMoraPortfolioAction, unpublishMoraPortfolioAction } from "../actions";

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

  const publicPath = profile?.handle ? `/${profile.handle}` : null;

  async function publishAction() {
    "use server";
    await publishMoraPortfolioAction();
  }

  async function unpublishAction() {
    "use server";
    await unpublishMoraPortfolioAction();
  }

  return (
    <section className="max-w-3xl">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#d95c3b]">
        Publish
      </p>
      <h1 className="mt-3 font-serif text-5xl leading-none tracking-[-0.06em]">
        Prepare your public portfolio
      </h1>
      <div className="mt-8 rounded-lg border border-[#1d2b27]/10 bg-white p-6">
        {profile ? (
          <>
            <p className="text-sm font-semibold">
              {profile.is_published ? "Your MORA is live." : "Your MORA is still a draft."}
            </p>
            <p className="mt-3 leading-7 text-[#1d2b27]/65">
              Public portfolio pages stay separate from this authenticated dashboard so
              they can remain fast, cacheable, and independent of logged-in state.
            </p>
            <p className="mt-4 rounded-md bg-[#f7f3ed] px-4 py-3 text-sm text-[#1d2b27]/70">
              Public handle: {profile.handle}
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <form action={publishAction}>
                <button
                  type="submit"
                  className="w-full rounded-md bg-[#d95c3b] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#c94f31] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1d2b27] sm:w-auto"
                >
                  {profile.is_published ? "Republish changes" : "Publish portfolio"}
                </button>
              </form>
              {profile.is_published && (
                <>
                  {publicPath && (
                    <Link
                      href={publicPath}
                      className="rounded-md border border-[#1d2b27]/15 px-5 py-3 text-center text-sm font-semibold transition-colors hover:bg-[#f7f3ed] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d95c3b]"
                    >
                      View public page
                    </Link>
                  )}
                  <form action={unpublishAction}>
                    <button
                      type="submit"
                      className="w-full rounded-md border border-[#b93d25]/25 px-5 py-3 text-sm font-semibold text-[#b93d25] transition-colors hover:bg-[#fff4ed] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d95c3b] sm:w-auto"
                    >
                      Unpublish
                    </button>
                  </form>
                </>
              )}
            </div>
            <p className="mt-5 text-sm leading-6 text-[#1d2b27]/55">
              Publishing or editing invalidates only this handle, so one portfolio update
              does not rebuild or redeploy the application.
            </p>
          </>
        ) : (
          <div>
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
