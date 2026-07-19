import { createProfileAction, type MoraIntakeDraft } from "@/app/dashboard/actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { MoraWizard } from "./MoraWizard";

const fallbackDraft: MoraIntakeDraft = {
  fullName: "",
  handle: "",
  role: "",
  goal: "",
  bio: "",
  socialLinks: [],
  skills: [],
  achievements: [],
  projects: [],
  stories: [],
  images: [],
  consent: false,
  status: "draft",
  currentStep: 0,
};

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

function readIntakeDraft(value: unknown): Partial<MoraIntakeDraft> {
  if (!value || typeof value !== "object") {
    return {};
  }

  const blueprint = value as { intake?: Partial<MoraIntakeDraft> };
  return blueprint.intake && typeof blueprint.intake === "object" ? blueprint.intake : {};
}

export default async function EditPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, name, handle, headline, bio, goal")
    .eq("user_id", user?.id ?? "")
    .maybeSingle();

  if (!profile) {
    return (
      <section className="grid min-h-[62vh] place-items-center">
        <div className="max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#d95c3b]">
            Create your MORA
          </p>
          <h1 className="mt-5 font-serif text-5xl leading-[0.95] tracking-[-0.06em] sm:text-6xl">
            Start the intake wizard.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-[#1d2b27]/68">
            We will save a draft profile first, then guide you through the content,
            proof, images, and consent needed for your MORA.
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

  const { data: blueprint } = await supabase
    .from("portfolio_blueprints")
    .select("blueprint_json")
    .eq("profile_id", profile.id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const savedDraft = readIntakeDraft(blueprint?.blueprint_json);
  const initialDraft: MoraIntakeDraft = {
    ...fallbackDraft,
    ...savedDraft,
    fullName: savedDraft.fullName ?? profile.name ?? "",
    handle: savedDraft.handle ?? profile.handle ?? "",
    role: savedDraft.role ?? profile.headline ?? "",
    goal: savedDraft.goal ?? (profile.goal as MoraIntakeDraft["goal"]) ?? "",
    bio: savedDraft.bio ?? profile.bio ?? "",
  };

  return <MoraWizard initialDraft={initialDraft} projectName={getProjectName()} />;
}
