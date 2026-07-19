import { createSupabaseServerClient } from "@/lib/supabase/server";

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
      <div className="mt-8 rounded-lg border border-[#1d2b27]/10 bg-white p-6">
        {profile ? (
          <>
            <p className="text-sm font-semibold">
              {profile.is_published ? "Your MORA is live." : "Your MORA is still a draft."}
            </p>
            <p className="mt-3 leading-7 text-[#1d2b27]/65">
              Public portfolio pages stay separate from this authenticated dashboard so
              they can remain fast and cacheable.
            </p>
            <p className="mt-4 rounded-md bg-[#f7f3ed] px-4 py-3 text-sm text-[#1d2b27]/70">
              Public handle: {profile.handle}
            </p>
          </>
        ) : (
          <p className="leading-7 text-[#1d2b27]/65">
            Create your MORA before publishing.
          </p>
        )}
      </div>
    </section>
  );
}
