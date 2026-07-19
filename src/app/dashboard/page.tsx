import Link from "next/link";

import { createSupabaseServerClient } from "@/lib/supabase/server";

import { createProfileAction } from "./actions";

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, handle, name, headline, bio, is_published, updated_at")
    .eq("user_id", user?.id ?? "")
    .maybeSingle();

  if (!profile) {
    return (
      <section className="grid min-h-[62vh] place-items-center">
        <div className="max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#d95c3b]">
            Welcome to MORA
          </p>
          <h1 className="mt-5 font-serif text-5xl leading-[0.95] tracking-[-0.06em] sm:text-6xl">
            Your portfolio workspace is ready.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-[#1d2b27]/68">
            Start with a blank MORA profile, then add the work, proof, and details you
            want to shape into a public presence.
          </p>
          <form action={createProfileAction} className="mt-8">
            <button
              type="submit"
              className="rounded-md bg-[#d95c3b] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#c94f31] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1d2b27]"
            >
              Create my MORA
            </button>
          </form>
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="flex flex-col gap-6 border-b border-[#1d2b27]/10 pb-8 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#d95c3b]">
            My Portfolio
          </p>
          <h1 className="mt-3 font-serif text-5xl leading-none tracking-[-0.06em]">
            {profile.name || "Untitled MORA"}
          </h1>
          <p className="mt-3 text-[#1d2b27]/65">mora.app/{profile.handle}</p>
        </div>
        <Link
          href="/dashboard/edit"
          className="rounded-md bg-[#1d2b27] px-4 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-[#283a35] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d95c3b]"
        >
          Edit portfolio
        </Link>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <article className="rounded-lg border border-[#1d2b27]/10 bg-white p-5">
          <p className="text-sm font-semibold">Status</p>
          <p className="mt-3 text-2xl font-semibold tracking-[-0.04em]">
            {profile.is_published ? "Published" : "Draft"}
          </p>
        </article>
        <article className="rounded-lg border border-[#1d2b27]/10 bg-white p-5 md:col-span-2">
          <p className="text-sm font-semibold">Headline</p>
          <p className="mt-3 leading-7 text-[#1d2b27]/65">
            {profile.headline || "Add a headline in Edit when you are ready."}
          </p>
        </article>
      </div>
    </section>
  );
}
