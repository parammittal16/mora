import "server-only";

import { createClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";

import { getSupabasePublicConfig } from "@/lib/supabase/config";
import type { Database, Json, PortfolioItem, Profile } from "@/types/database";

const IMAGE_BUCKET = "mora-intake-images";
const PUBLIC_PROFILE_REVALIDATE_SECONDS = 60 * 60;

export function publicProfileTag(handle: string) {
  return `public-profile:${handle}`;
}

export type PublicPortfolioLens = "default" | "recruiter";

export type PublicPortfolioImage = {
  name: string;
  url: string | null;
};

export type PublicPortfolioLink = {
  label: string;
  url: string;
};

export type PublicPortfolioStrength = {
  title: string;
  explanation: string;
  evidence: string;
};

export type PublicPortfolioProject = {
  title: string;
  description: string;
  evidence: string;
  skills: string[];
  url?: string | null;
  imageUrl?: string | null;
};

export type PublicPortfolio = {
  profile: Profile;
  headline: string;
  shortBio: string;
  targetAudience: string;
  voice: string;
  strengths: PublicPortfolioStrength[];
  projects: PublicPortfolioProject[];
  gallery: PublicPortfolioImage[];
  socialLinks: PublicPortfolioLink[];
  achievements: string[];
  skills: string[];
  stories: string[];
  updatedAt: string;
};

type IntakeImage = {
  name?: string;
  path?: string;
};

type GeneratedBlueprint = {
  positioning?: {
    headline?: string;
    short_bio?: string;
    voice?: string;
    target_audience?: string;
  };
  strengths?: {
    title?: string;
    explanation?: string;
    evidence_text?: string;
  }[];
  featured_projects?: {
    title?: string;
    description?: string;
    relevant_skills?: string[];
    evidence_text?: string;
  }[];
};

const DEMO_PROFILE_HANDLE = "parammittal16";
const DEMO_UPDATED_AT = "2026-07-19T00:00:00.000Z";

function getDemoPublicPortfolio(handle: string): PublicPortfolio | null {
  if (handle.toLowerCase() !== DEMO_PROFILE_HANDLE) return null;

  return {
    profile: {
      id: "00000000-0000-4000-8000-000000000016",
      user_id: "00000000-0000-4000-8000-000000000001",
      handle: DEMO_PROFILE_HANDLE,
      name: "Param Mittal",
      headline: "Product builder focused on AI-native portfolio tools",
      bio: "Editable demo profile for MORA reviewers. Param is presented as a product-minded builder who turns ambiguous ideas into polished web experiences, using careful UX, practical AI workflows, and fast iteration.",
      avatar_url: null,
      goal: "showcase_work",
      theme: "default",
      is_published: true,
      created_at: DEMO_UPDATED_AT,
      updated_at: DEMO_UPDATED_AT,
    },
    headline: "Param Mittal builds useful AI product experiences with clear proof and careful craft.",
    shortBio:
      "This is realistic demo content created for judging MORA. Every section is intentionally editable: it shows how a founder, builder, or student could present product thinking, implementation quality, and taste without scraping social media.",
    targetAudience: "hiring teams, collaborators, and hackathon judges looking for product judgment and reliable execution",
    voice: "direct, thoughtful, practical, and evidence-led",
    strengths: [
      {
        title: "Turns vague ideas into shipped flows",
        explanation:
          "Frames the user problem, trims unnecessary surface area, and builds the end-to-end workflow that makes the product usable quickly.",
        evidence:
          "Demo evidence: MORA moves from intake to public portfolio with validation, publishing controls, and cache revalidation.",
      },
      {
        title: "Balances AI assistance with user control",
        explanation:
          "Uses AI to shape structure and language while keeping submitted content, consent, and editable review at the center of the experience.",
        evidence:
          "Demo evidence: social links are display-only, AI is not called during intake, and generated claims must be reviewed.",
      },
      {
        title: "Builds polished interfaces that stay practical",
        explanation:
          "Prioritizes scanning, predictable controls, and clear state changes over decorative complexity.",
        evidence:
          "Demo evidence: draft and published states are visually distinct, with confirmation before publishing and a success screen after launch.",
      },
    ],
    projects: [
      {
        title: "MORA publishing workflow",
        description:
          "A portfolio publishing path with required-field validation, confirmation, success sharing, copy-link support, and public-page revalidation.",
        evidence:
          "Built as realistic demo content for review; replace this item with your own shipped product, case study, or project summary.",
        skills: ["Next.js", "Product UX", "Supabase", "Server Actions"],
        url: null,
        imageUrl: null,
      },
      {
        title: "Consent-first portfolio intake",
        description:
          "A guided intake that captures user-owned images, proof points, projects, stories, and links without scraping external profiles.",
        evidence:
          "The workflow separates draft saving, submitted intake, and optional AI blueprint generation.",
        skills: ["UX writing", "Validation", "AI workflows"],
        url: null,
        imageUrl: null,
      },
      {
        title: "Public profile rendering",
        description:
          "A cacheable public route that presents strengths, projects, social links, metadata, and alternate recruiter-oriented ordering.",
        evidence:
          "The page supports /parammittal16 and a recruiter lens while keeping portfolio data grounded in explicit content.",
        skills: ["App Router", "ISR", "Metadata"],
        url: null,
        imageUrl: null,
      },
    ],
    gallery: [
      { name: "Editable product workspace screenshot placeholder", url: null },
      { name: "Portfolio proof image placeholder", url: null },
      { name: "Launch notes image placeholder", url: null },
      { name: "Case study visual placeholder", url: null },
    ],
    socialLinks: [
      { label: "Demo website", url: "https://example.com/parammittal16" },
      { label: "Editable contact", url: "https://example.com/contact" },
    ],
    achievements: [
      "Designed a publishing workflow that distinguishes draft and public states.",
      "Added validation for name, handle, headline, and portfolio proof before launch.",
      "Created a demo profile that works without scraped social-media content.",
    ],
    skills: ["Product design", "Next.js", "Supabase", "AI product strategy", "UX systems"],
    stories: [
      "The best portfolios are not scraped summaries; they are intentional selections of proof.",
      "A public page should feel shareable only after the owner has reviewed the final state.",
    ],
    updatedAt: DEMO_UPDATED_AT,
  };
}

function createSupabaseAnonServerClient() {
  const { url, publishableKey } = getSupabasePublicConfig();

  return createClient<Database>(url, publishableKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

function createOptionalSupabaseAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) return null;

  const { url } = getSupabasePublicConfig();

  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asStringArray(value: unknown) {
  return (Array.isArray(value) ? value : [])
    .map((item) => asString(item))
    .filter(Boolean);
}

function readIntake(blueprintJson: Json | null | undefined) {
  if (!isRecord(blueprintJson) || !isRecord(blueprintJson.intake)) {
    return {};
  }

  return blueprintJson.intake;
}

function readGeneratedBlueprint(
  blueprintJson: Json | null | undefined,
): GeneratedBlueprint | undefined {
  if (!isRecord(blueprintJson) || !isRecord(blueprintJson.generated_blueprint)) {
    return undefined;
  }

  return blueprintJson.generated_blueprint as GeneratedBlueprint;
}

function readSocialLinks(intake: Record<string, unknown>) {
  return (Array.isArray(intake.socialLinks) ? intake.socialLinks : [])
    .map((item) => {
      if (!isRecord(item)) return null;
      const label = asString(item.label);
      const url = asString(item.url);
      if (!url) return null;

      return {
        label: label || url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, ""),
        url,
      };
    })
    .filter((link): link is PublicPortfolioLink => Boolean(link))
    .slice(0, 8);
}

function readImages(intake: Record<string, unknown>) {
  return (Array.isArray(intake.images) ? intake.images : [])
    .map((item) => {
      if (!isRecord(item)) return null;
      const image: IntakeImage = {
        name: asString(item.name),
        path: asString(item.path),
      };

      return image.name && image.path ? image : null;
    })
    .filter((image): image is Required<IntakeImage> => Boolean(image))
    .slice(0, 8);
}

async function createSignedImageMap(paths: string[]) {
  if (paths.length === 0) return new Map<string, string>();

  const supabase = createOptionalSupabaseAdminClient();
  if (!supabase) return new Map<string, string>();

  const signedUrls = await Promise.all(
    paths.map(async (path) => {
      const { data, error } = await supabase.storage
        .from(IMAGE_BUCKET)
        .createSignedUrl(path, PUBLIC_PROFILE_REVALIDATE_SECONDS + 300);

      return error || !data?.signedUrl ? null : ([path, data.signedUrl] as const);
    }),
  );

  return new Map(signedUrls.filter((entry): entry is readonly [string, string] => Boolean(entry)));
}

function portfolioItemsToProjects(items: PortfolioItem[], signedImages: Map<string, string>) {
  return items
    .filter((item) => item.type === "project")
    .map((item) => ({
      title: item.title,
      description: item.description || "",
      evidence: item.evidence_text || "",
      skills: [],
      url: item.external_url,
      imageUrl: item.image_url ? signedImages.get(item.image_url) || item.image_url : null,
    }));
}

async function fetchPublicPortfolio(handle: string): Promise<PublicPortfolio | null> {
  const normalizedHandle = handle.toLowerCase();
  const demoPortfolio = getDemoPublicPortfolio(normalizedHandle);
  if (demoPortfolio) return demoPortfolio;

  const supabase = createSupabaseAnonServerClient();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("handle", normalizedHandle)
    .eq("is_published", true)
    .maybeSingle();

  if (profileError) {
    throw new Error(profileError.message);
  }

  if (!profile) return null;

  const [{ data: items, error: itemError }, { data: blueprintRows, error: blueprintError }] =
    await Promise.all([
      supabase
        .from("portfolio_items")
        .select("*")
        .eq("profile_id", profile.id)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
      supabase
        .from("portfolio_blueprints")
        .select("blueprint_json, updated_at")
        .eq("profile_id", profile.id)
        .order("updated_at", { ascending: false })
        .limit(1),
    ]);

  if (itemError) throw new Error(itemError.message);
  if (blueprintError) throw new Error(blueprintError.message);

  const blueprintRow = blueprintRows?.[0];
  const intake = readIntake(blueprintRow?.blueprint_json);
  const generated = readGeneratedBlueprint(blueprintRow?.blueprint_json);
  const intakeImages = readImages(intake);
  const itemImages = (items ?? []).map((item) => item.image_url).filter(Boolean) as string[];
  const signedImages = await createSignedImageMap([
    ...new Set([...intakeImages.map((image) => image.path), ...itemImages]),
  ]);

  const achievements = asStringArray(intake.achievements);
  const skills = asStringArray(intake.skills);
  const stories = asStringArray(intake.stories);
  const generatedStrengths = generated?.strengths ?? [];
  const generatedProjects = generated?.featured_projects ?? [];
  const itemProjects = portfolioItemsToProjects(items ?? [], signedImages);

  const strengths =
    generatedStrengths.length > 0
      ? generatedStrengths.map((strength) => ({
          title: asString(strength.title),
          explanation: asString(strength.explanation),
          evidence: asString(strength.evidence_text),
        }))
      : achievements.slice(0, 4).map((achievement, index) => ({
          title: skills[index] || `Proof point ${index + 1}`,
          explanation: achievement,
          evidence: stories[index] || achievement,
        }));

  const projects =
    itemProjects.length > 0
      ? itemProjects
      : generatedProjects.map((project, index) => ({
          title: asString(project.title) || `Featured project ${index + 1}`,
          description: asString(project.description),
          evidence: asString(project.evidence_text),
          skills: asStringArray(project.relevant_skills),
        }));

  return {
    profile,
    headline:
      asString(generated?.positioning?.headline) ||
      profile.headline ||
      `${profile.name || profile.handle} builds thoughtful work with visible proof.`,
    shortBio: asString(generated?.positioning?.short_bio) || profile.bio || "",
    targetAudience: asString(generated?.positioning?.target_audience),
    voice: asString(generated?.positioning?.voice),
    strengths: strengths.filter((strength) => strength.title || strength.explanation),
    projects: projects.filter((project) => project.title || project.description),
    gallery: intakeImages.map((image) => ({
      name: image.name,
      url: signedImages.get(image.path) ?? null,
    })),
    socialLinks: readSocialLinks(intake),
    achievements,
    skills,
    stories,
    updatedAt: blueprintRow?.updated_at || profile.updated_at,
  };
}

export async function getPublicPortfolio(handle: string) {
  const normalizedHandle = handle.toLowerCase();

  return unstable_cache(
    () => fetchPublicPortfolio(normalizedHandle),
    ["public-profile", normalizedHandle],
    {
      revalidate: PUBLIC_PROFILE_REVALIDATE_SECONDS,
      tags: [publicProfileTag(normalizedHandle)],
    },
  )();
}

export async function getSeededPublicPortfolioParams() {
  const seededHandle = process.env.NEXT_PUBLIC_DEMO_PROFILE_HANDLE || DEMO_PROFILE_HANDLE;
  const params = [{ handle: DEMO_PROFILE_HANDLE }];

  if (seededHandle === DEMO_PROFILE_HANDLE) return params;

  try {
    const supabase = createSupabaseAnonServerClient();
    const { data } = await supabase
      .from("profiles")
      .select("handle")
      .eq("handle", seededHandle)
      .eq("is_published", true)
      .maybeSingle();

    return data?.handle ? [...params, { handle: data.handle }] : params;
  } catch {
    return params;
  }
}
