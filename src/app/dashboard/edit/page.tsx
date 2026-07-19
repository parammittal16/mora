import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function EditPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, name, handle, headline, bio")
    .eq("user_id", user?.id ?? "")
    .maybeSingle();

  return (
    <section className="max-w-3xl">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#d95c3b]">
        Edit
      </p>
      <h1 className="mt-3 font-serif text-5xl leading-none tracking-[-0.06em]">
        Shape your MORA
      </h1>
      <div className="mt-8 rounded-lg border border-[#1d2b27]/10 bg-white p-6">
        {profile ? (
          <dl className="grid gap-5">
            <div>
              <dt className="text-sm font-semibold">Name</dt>
              <dd className="mt-1 text-[#1d2b27]/65">{profile.name || "Not set"}</dd>
            </div>
            <div>
              <dt className="text-sm font-semibold">Handle</dt>
              <dd className="mt-1 text-[#1d2b27]/65">{profile.handle}</dd>
            </div>
            <div>
              <dt className="text-sm font-semibold">Headline</dt>
              <dd className="mt-1 text-[#1d2b27]/65">{profile.headline || "Not set"}</dd>
            </div>
            <div>
              <dt className="text-sm font-semibold">Bio</dt>
              <dd className="mt-1 text-[#1d2b27]/65">{profile.bio || "Not set"}</dd>
            </div>
          </dl>
        ) : (
          <p className="leading-7 text-[#1d2b27]/65">
            Create your MORA from the portfolio tab before editing details.
          </p>
        )}
      </div>
    </section>
  );
}
