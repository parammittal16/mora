"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { publicProfileTag } from "@/lib/public-portfolio";
import type { Json } from "@/types/database";

export type MoraGoal = "get_hired" | "win_clients" | "showcase_work" | "build_community";

export type IntakeLink = {
  label: string;
  url: string;
};

export type IntakeImage = {
  name: string;
  path: string;
  size: number;
  type: string;
  uploadedAt: string;
};

export type MoraIntakeDraft = {
  fullName: string;
  handle: string;
  role: string;
  goal: MoraGoal | "";
  bio: string;
  socialLinks: IntakeLink[];
  skills: string[];
  achievements: string[];
  projects: string[];
  stories: string[];
  images: IntakeImage[];
  consent: boolean;
  status: "draft" | "submitted";
  currentStep: number;
  updatedAt?: string;
  submittedAt?: string;
};

const aiPortfolioBlueprintSchema = z.object({
  positioning: z.object({
    headline: z.string().min(1).max(140),
    short_bio: z.string().min(1).max(700),
    voice: z.string().min(1).max(160),
    target_audience: z.string().min(1).max(180),
  }),
  strengths: z
    .array(
      z.object({
        title: z.string().min(1).max(100),
        explanation: z.string().min(1).max(360),
        evidence_text: z.string().min(1).max(360),
      }),
    )
    .min(1)
    .max(6),
  featured_projects: z
    .array(
      z.object({
        title: z.string().min(1).max(120),
        description: z.string().min(1).max(500),
        relevant_skills: z.array(z.string().min(1).max(60)).max(8),
        evidence_text: z.string().min(1).max(420),
      }),
    )
    .min(1)
    .max(6),
  recommended_media_order: z.array(z.string().min(1).max(140)).max(8),
  visual_direction: z.object({
    palette: z.string().min(1).max(180),
    typography_mood: z.string().min(1).max(160),
    layout_style: z.string().min(1).max(220),
  }),
  missing_proof_suggestions: z.array(z.string().min(1).max(260)).max(8),
});

export type AiPortfolioBlueprint = z.infer<typeof aiPortfolioBlueprintSchema>;

export type AiGenerationActionResult = {
  ok: boolean;
  message: string;
  blueprint?: AiPortfolioBlueprint;
  retryAfterSeconds?: number;
};

export type IntakeActionResult = {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string>;
  draft?: MoraIntakeDraft;
};

export type PublishActionResult = {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string>;
  handle?: string;
  publicPath?: string;
};

const HANDLE_PATTERN = /^[a-z0-9][a-z0-9_-]{2,29}$/;
const GOALS: MoraGoal[] = [
  "get_hired",
  "win_clients",
  "showcase_work",
  "build_community",
];
const IMAGE_BUCKET = "mora-intake-images";
const MAX_IMAGE_SIZE = 8 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const AI_GENERATION_WINDOW_MS = 24 * 60 * 60 * 1000;
const AI_GENERATION_LIMIT = 3;
const AI_GENERATION_COOLDOWN_MS = 90 * 1000;

function revalidatePublicPortfolio(handle?: string | null) {
  if (!handle) return;

  revalidatePath(`/${handle}`);
  updateTag(publicProfileTag(handle));
}

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

function sanitizeText(value: unknown, maxLength: number) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function sanitizeLongText(value: unknown, maxLength: number) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function sanitizeHandle(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "")
    .slice(0, 30);
}

function sanitizeList(value: unknown, maxItems: number, maxLength: number) {
  return (Array.isArray(value) ? value : [])
    .map((item) => sanitizeLongText(item, maxLength))
    .filter(Boolean)
    .slice(0, maxItems);
}

function sanitizeLinks(value: unknown) {
  return (Array.isArray(value) ? value : [])
    .map((item) => {
      const link = item as Partial<IntakeLink>;
      const label = sanitizeText(link.label, 42);
      const rawUrl = sanitizeText(link.url, 240);

      try {
        const url = new URL(rawUrl);
        if (!["http:", "https:"].includes(url.protocol)) {
          return null;
        }

        return {
          label: label || url.hostname.replace(/^www\./, ""),
          url: url.toString(),
        };
      } catch {
        return null;
      }
    })
    .filter((link): link is IntakeLink => Boolean(link))
    .slice(0, 8);
}

function sanitizeImages(value: unknown) {
  return (Array.isArray(value) ? value : [])
    .map((item) => {
      const image = item as Partial<IntakeImage>;
      return {
        name: sanitizeText(image.name, 120),
        path: sanitizeText(image.path, 400),
        size: Number(image.size) || 0,
        type: sanitizeText(image.type, 60),
        uploadedAt: sanitizeText(image.uploadedAt, 40),
      };
    })
    .filter((image) => image.name && image.path)
    .slice(0, 8);
}

function normalizeDraft(input: Partial<MoraIntakeDraft>): MoraIntakeDraft {
  const goal = GOALS.includes(input.goal as MoraGoal) ? (input.goal as MoraGoal) : "";

  return {
    fullName: sanitizeText(input.fullName, 96),
    handle: sanitizeHandle(input.handle),
    role: sanitizeText(input.role, 96),
    goal,
    bio: sanitizeLongText(input.bio, 700),
    socialLinks: sanitizeLinks(input.socialLinks),
    skills: sanitizeList(input.skills, 20, 48),
    achievements: sanitizeList(input.achievements, 12, 160),
    projects: sanitizeList(input.projects, 12, 220),
    stories: sanitizeList(input.stories, 12, 260),
    images: sanitizeImages(input.images),
    consent: Boolean(input.consent),
    status: input.status === "submitted" ? "submitted" : "draft",
    currentStep: Math.min(Math.max(Number(input.currentStep) || 0, 0), 6),
    updatedAt: new Date().toISOString(),
    submittedAt: input.submittedAt,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function readIntakeFromBlueprint(value: unknown) {
  return isRecord(value) && isRecord(value.intake)
    ? (value.intake as Partial<MoraIntakeDraft>)
    : {};
}

function readGeneratedBlueprint(value: unknown) {
  if (!isRecord(value)) return undefined;
  const parsed = aiPortfolioBlueprintSchema.safeParse(value.generated_blueprint);
  return parsed.success ? parsed.data : undefined;
}

function readGenerationAttempts(value: unknown) {
  if (!isRecord(value) || !isRecord(value.ai_generation)) return [];
  const attempts = value.ai_generation.attempts;
  return (Array.isArray(attempts) ? attempts : [])
    .map((attempt) => (typeof attempt === "string" ? Date.parse(attempt) : Number.NaN))
    .filter(Number.isFinite);
}

function createBlueprintPayload({
  current,
  draft,
  generatedBlueprint,
  attempts,
}: {
  current: unknown;
  draft: MoraIntakeDraft;
  generatedBlueprint?: AiPortfolioBlueprint;
  attempts?: string[];
}) {
  const existing = isRecord(current) ? current : {};
  const existingGeneration = isRecord(existing.ai_generation) ? existing.ai_generation : {};
  const savedAttempts = Array.isArray(existingGeneration.attempts)
    ? existingGeneration.attempts.filter((attempt): attempt is string => typeof attempt === "string")
    : [];

  return {
    ...existing,
    source: "mora_intake_v1",
    socialLinksPolicy: "display_only_never_scrape",
    intake: draft,
    ...(generatedBlueprint ? { generated_blueprint: generatedBlueprint } : {}),
    ai_generation: {
      ...existingGeneration,
      provider: "openai_compatible",
      ...(generatedBlueprint ? { lastGeneratedAt: new Date().toISOString() } : {}),
      attempts: attempts ?? savedAttempts,
    },
  };
}

function validateDraft(draft: MoraIntakeDraft, mode: "draft" | "submit") {
  const fieldErrors: Record<string, string> = {};

  if (draft.handle && !HANDLE_PATTERN.test(draft.handle)) {
    fieldErrors.handle =
      "Use 3-30 lowercase letters, numbers, underscores, or hyphens. Start with a letter or number.";
  }

  if (mode === "submit") {
    if (!draft.fullName) fieldErrors.fullName = "Add your full name.";
    if (!draft.handle) fieldErrors.handle = fieldErrors.handle || "Choose a public handle.";
    if (!draft.role) fieldErrors.role = "Add your role or profession.";
    if (!draft.goal) fieldErrors.goal = "Choose your main goal.";
    if (!draft.bio || draft.bio.length < 24) fieldErrors.bio = "Write a short bio with at least 24 characters.";
    if (draft.skills.length === 0) fieldErrors.skills = "Add at least one skill.";
    if (draft.achievements.length === 0) fieldErrors.achievements = "Add at least one achievement.";
    if (draft.projects.length === 0) fieldErrors.projects = "Add at least one project or experience.";
    if (draft.stories.length === 0) fieldErrors.stories = "Add at least one caption, moment, or story.";
    if (draft.images.length < 4 || draft.images.length > 8) {
      fieldErrors.images = "Upload 4 to 8 user-owned images.";
    }
    if (!draft.consent) {
      fieldErrors.consent = "Confirm that you own or have permission to use the submitted content.";
    }
  }

  return fieldErrors;
}

async function getAuthenticatedProfile() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/sign-in?next=/dashboard/edit");
  }

  const { data: existingProfile, error: selectError } = await supabase
    .from("profiles")
    .select("id, user_id, handle, name, goal, is_published")
    .eq("user_id", user.id)
    .maybeSingle();

  if (selectError) {
    throw new Error(selectError.message);
  }

  if (existingProfile) {
    return { supabase, user, profile: existingProfile };
  }

  const seed = createHandleSeed(user.email);
  const fallback = user.id.replace(/-/g, "").slice(0, 8);
  const handle = `${seed}-${fallback}`.slice(0, 30);

  const { data: profile, error: insertError } = await supabase
    .from("profiles")
    .insert({
      user_id: user.id,
      handle,
      name: user.user_metadata?.full_name ?? null,
      avatar_url: user.user_metadata?.avatar_url ?? null,
    })
    .select("id, user_id, handle, name, goal, is_published")
    .single();

  if (insertError) {
    throw new Error(insertError.message);
  }

  return { supabase, user, profile };
}

async function assertHandleAvailable(handle: string, profileId: string) {
  if (!HANDLE_PATTERN.test(handle)) {
    return "Use 3-30 lowercase letters, numbers, underscores, or hyphens. Start with a letter or number.";
  }

  const supabase = await createSupabaseServerClient();
  const { data: existing, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("handle", handle)
    .neq("id", profileId)
    .maybeSingle();

  if (error) {
    return "Could not validate that handle. Try again.";
  }

  return existing ? "That handle is already taken." : null;
}

async function getLatestBlueprint(profileId: string) {
  const supabase = await createSupabaseServerClient();
  const { data: existing, error: selectError } = await supabase
    .from("portfolio_blueprints")
    .select("id, blueprint_json")
    .eq("profile_id", profileId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (selectError) {
    throw new Error(selectError.message);
  }

  return { supabase, existing };
}

async function upsertBlueprint(profileId: string, draft: MoraIntakeDraft) {
  const { supabase, existing } = await getLatestBlueprint(profileId);
  const generatedBlueprint = readGeneratedBlueprint(existing?.blueprint_json);
  const blueprint = createBlueprintPayload({
    current: existing?.blueprint_json,
    draft,
    generatedBlueprint,
  });

  const { error } = existing
    ? await supabase
        .from("portfolio_blueprints")
        .update({ blueprint_json: blueprint as Json })
        .eq("id", existing.id)
    : await supabase.from("portfolio_blueprints").insert({
        profile_id: profileId,
        blueprint_json: blueprint as Json,
      });

  if (error) {
    throw new Error(error.message);
  }
}

function getAiProviderConfig() {
  const apiKey = process.env.OPENAI_COMPATIBLE_API_KEY || process.env.OPENROUTER_API_KEY;
  const baseUrl =
    process.env.OPENAI_COMPATIBLE_BASE_URL ||
    process.env.OPENROUTER_BASE_URL ||
    "https://openrouter.ai/api/v1";
  const model = process.env.OPENAI_COMPATIBLE_MODEL || process.env.OPENROUTER_MODEL;

  if (!apiKey || !model) {
    return {
      ok: false as const,
      message:
        "AI generation is not configured. Set OPENAI_COMPATIBLE_API_KEY and OPENAI_COMPATIBLE_MODEL on the server.",
    };
  }

  return { ok: true as const, apiKey, baseUrl: baseUrl.replace(/\/$/, ""), model };
}

function createAiPrompt(draft: MoraIntakeDraft) {
  const imageMetadata = draft.images.map((image, index) => ({
    id: `image_${index + 1}`,
    name: image.name,
    type: image.type,
    size: image.size,
    uploadedAt: image.uploadedAt,
  }));

  return [
    "Create a portfolio blueprint from only the submitted intake below.",
    "Critical rules:",
    "- Never invent employers, achievements, skills, metrics, clients, dates, or projects.",
    "- Every claim must be traceable to the submitted evidence.",
    "- Use evidence_text copied or closely grounded in the submitted text.",
    "- If evidence is weak, say that clearly in missing_proof_suggestions.",
    "- Social links are display-only metadata. Do not infer facts from them and do not scrape them.",
    "- Images are metadata only. Do not infer visual content beyond filename/type/size.",
    "",
    "Return only strict JSON matching this TypeScript shape:",
    JSON.stringify(
      {
        positioning: {
          headline: "string",
          short_bio: "string",
          voice: "string",
          target_audience: "string",
        },
        strengths: [{ title: "string", explanation: "string", evidence_text: "string" }],
        featured_projects: [
          {
            title: "string",
            description: "string",
            relevant_skills: ["string"],
            evidence_text: "string",
          },
        ],
        recommended_media_order: ["image_1"],
        visual_direction: {
          palette: "string",
          typography_mood: "string",
          layout_style: "string",
        },
        missing_proof_suggestions: ["string"],
      },
      null,
      2,
    ),
    "",
    "Submitted text:",
    JSON.stringify(
      {
        fullName: draft.fullName,
        handle: draft.handle,
        role: draft.role,
        goal: draft.goal,
        bio: draft.bio,
        socialLinks: draft.socialLinks,
        skills: draft.skills,
        achievements: draft.achievements,
        projects: draft.projects,
        stories: draft.stories,
        imageMetadata,
      },
      null,
      2,
    ),
  ].join("\n");
}

function parseJsonObject(content: string) {
  try {
    return JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("The AI response did not include JSON.");
    return JSON.parse(match[0]);
  }
}

async function callOpenAiCompatibleProvider(draft: MoraIntakeDraft) {
  const config = getAiProviderConfig();
  if (!config.ok) return config;

  try {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.OPENAI_COMPATIBLE_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "",
        "X-Title": process.env.OPENAI_COMPATIBLE_APP_NAME || "MORA",
      },
      body: JSON.stringify({
        model: config.model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are a cautious portfolio strategist. You must ground every claim in the user's provided evidence and return only valid JSON.",
          },
          { role: "user", content: createAiPrompt(draft) },
        ],
      }),
    });

    if (!response.ok) {
      return {
        ok: false as const,
        message: `AI provider request failed with status ${response.status}. Try again later.`,
      };
    }

    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return { ok: false as const, message: "AI provider returned an empty response." };
    }

    const parsed = aiPortfolioBlueprintSchema.safeParse(parseJsonObject(content));
    if (!parsed.success) {
      return {
        ok: false as const,
        message: "AI returned a blueprint in an unexpected format. Please retry.",
      };
    }

    return { ok: true as const, blueprint: parsed.data };
  } catch {
    return { ok: false as const, message: "AI generation failed. Please retry." };
  }
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

export async function validateHandleAction(handleInput: string) {
  const { profile } = await getAuthenticatedProfile();
  const handle = sanitizeHandle(handleInput);
  const error = await assertHandleAvailable(handle, profile.id);

  return {
    ok: !error,
    handle,
    message: error || "This handle is available.",
  };
}

export async function saveMoraDraftAction(
  input: Partial<MoraIntakeDraft>,
): Promise<IntakeActionResult> {
  const { supabase, profile } = await getAuthenticatedProfile();
  const draft = normalizeDraft({ ...input, status: "draft" });
  const fieldErrors = validateDraft(draft, "draft");

  if (draft.handle) {
    const handleError = await assertHandleAvailable(draft.handle, profile.id);
    if (handleError) fieldErrors.handle = handleError;
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, message: "Check the highlighted fields.", fieldErrors, draft };
  }

  const profileUpdate = {
    handle: draft.handle || profile.handle,
    name: draft.fullName || null,
    headline: draft.role || null,
    bio: draft.bio || null,
    goal: draft.goal || null,
  };

  const { error: profileError } = await supabase
    .from("profiles")
    .update(profileUpdate)
    .eq("id", profile.id);

  if (profileError) {
    return {
      ok: false,
      message: profileError.code === "23505" ? "That handle is already taken." : profileError.message,
      fieldErrors: profileError.code === "23505" ? { handle: "That handle is already taken." } : undefined,
      draft,
    };
  }

  await upsertBlueprint(profile.id, draft);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/edit");
  if (profile.is_published) {
    revalidatePublicPortfolio(profile.handle);
    revalidatePublicPortfolio(profileUpdate.handle);
  }

  return { ok: true, message: "Draft saved.", draft };
}

export async function uploadMoraDraftImagesAction(formData: FormData): Promise<IntakeActionResult> {
  const { supabase, user, profile } = await getAuthenticatedProfile();
  const payload = String(formData.get("payload") ?? "{}");
  let parsed: Partial<MoraIntakeDraft> = {};

  try {
    parsed = JSON.parse(payload) as Partial<MoraIntakeDraft>;
  } catch {
    return { ok: false, message: "The submitted draft could not be read." };
  }

  const baseDraft = normalizeDraft({ ...parsed, status: "draft" });
  const fieldErrors = validateDraft(baseDraft, "draft");

  if (baseDraft.handle) {
    const handleError = await assertHandleAvailable(baseDraft.handle, profile.id);
    if (handleError) fieldErrors.handle = handleError;
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, message: "Check the highlighted fields.", fieldErrors, draft: baseDraft };
  }

  const existingImages = sanitizeImages(parsed.images);
  const files = formData
    .getAll("images")
    .filter((file): file is File => file instanceof File && file.size > 0);

  if (existingImages.length + files.length > 8) {
    return {
      ok: false,
      message: "Keep your image set to 8 images or fewer.",
      fieldErrors: { images: "Keep your image set to 8 images or fewer." },
      draft: baseDraft,
    };
  }

  const uploadedImages: IntakeImage[] = [];

  for (const file of files) {
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      return {
        ok: false,
        message: "Images must be JPG, PNG, WEBP, or GIF files.",
        fieldErrors: { images: "Images must be JPG, PNG, WEBP, or GIF files." },
        draft: baseDraft,
      };
    }

    if (file.size > MAX_IMAGE_SIZE) {
      return {
        ok: false,
        message: "Each image must be 8MB or smaller.",
        fieldErrors: { images: "Each image must be 8MB or smaller." },
        draft: baseDraft,
      };
    }

    const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "img";
    const path = `${user.id}/${profile.id}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from(IMAGE_BUCKET)
      .upload(path, file, {
        cacheControl: "31536000",
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      const isMissingBucket = /bucket not found/i.test(uploadError.message);
      return {
        ok: false,
        message: isMissingBucket
          ? "Image storage is not set up yet. Apply the MORA image bucket migration in Supabase, then try again."
          : `Could not upload ${file.name}. Please try again.`,
        fieldErrors: {
          images: isMissingBucket
            ? "The mora-intake-images bucket is missing. Apply supabase/migrations/20260719001000_create_mora_intake_image_bucket.sql."
            : uploadError.message,
        },
        draft: baseDraft,
      };
    }

    uploadedImages.push({
      name: sanitizeText(file.name, 120),
      path,
      size: file.size,
      type: file.type,
      uploadedAt: new Date().toISOString(),
    });
  }

  const draft = normalizeDraft({
    ...parsed,
    images: [...existingImages, ...uploadedImages],
    status: "draft",
  });

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      handle: draft.handle || profile.handle,
      name: draft.fullName || null,
      headline: draft.role || null,
      bio: draft.bio || null,
      goal: draft.goal || null,
    })
    .eq("id", profile.id);

  if (profileError) {
    return {
      ok: false,
      message: profileError.code === "23505" ? "That handle is already taken." : profileError.message,
      fieldErrors: profileError.code === "23505" ? { handle: "That handle is already taken." } : undefined,
      draft,
    };
  }

  await upsertBlueprint(profile.id, draft);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/edit");
  if (profile.is_published) {
    revalidatePublicPortfolio(profile.handle);
    revalidatePublicPortfolio(draft.handle || profile.handle);
  }

  return { ok: true, message: "Images uploaded and draft saved.", draft };
}

export async function submitMoraIntakeAction(formData: FormData): Promise<IntakeActionResult> {
  const { supabase, user, profile } = await getAuthenticatedProfile();
  const payload = String(formData.get("payload") ?? "{}");
  let parsed: Partial<MoraIntakeDraft> = {};

  try {
    parsed = JSON.parse(payload) as Partial<MoraIntakeDraft>;
  } catch {
    return { ok: false, message: "The submitted draft could not be read." };
  }

  const existingImages = sanitizeImages(parsed.images);
  const files = formData
    .getAll("images")
    .filter((file): file is File => file instanceof File && file.size > 0);

  if (existingImages.length + files.length > 8) {
    return {
      ok: false,
      message: "Keep your image set to 8 images or fewer.",
      fieldErrors: { images: "Keep your image set to 8 images or fewer." },
    };
  }

  const uploadedImages: IntakeImage[] = [];

  for (const file of files) {
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      return {
        ok: false,
        message: "Images must be JPG, PNG, WEBP, or GIF files.",
        fieldErrors: { images: "Images must be JPG, PNG, WEBP, or GIF files." },
      };
    }

    if (file.size > MAX_IMAGE_SIZE) {
      return {
        ok: false,
        message: "Each image must be 8MB or smaller.",
        fieldErrors: { images: "Each image must be 8MB or smaller." },
      };
    }

    const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "img";
    const path = `${user.id}/${profile.id}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from(IMAGE_BUCKET)
      .upload(path, file, {
        cacheControl: "31536000",
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return {
        ok: false,
        message: `Could not upload ${file.name}. Make sure the Supabase storage bucket exists.`,
        fieldErrors: { images: uploadError.message },
      };
    }

    uploadedImages.push({
      name: sanitizeText(file.name, 120),
      path,
      size: file.size,
      type: file.type,
      uploadedAt: new Date().toISOString(),
    });
  }

  const draft = normalizeDraft({
    ...parsed,
    images: [...existingImages, ...uploadedImages],
    status: "submitted",
    currentStep: 6,
    submittedAt: new Date().toISOString(),
  });
  const fieldErrors = validateDraft(draft, "submit");
  const handleError = await assertHandleAvailable(draft.handle, profile.id);
  if (handleError) fieldErrors.handle = handleError;

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, message: "Check the highlighted fields.", fieldErrors, draft };
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      handle: draft.handle,
      name: draft.fullName,
      headline: draft.role,
      bio: draft.bio,
      goal: draft.goal,
      avatar_url: draft.images[0]?.path ?? null,
      is_published: false,
    })
    .eq("id", profile.id);

  if (profileError) {
    return {
      ok: false,
      message: profileError.code === "23505" ? "That handle is already taken." : profileError.message,
      fieldErrors: profileError.code === "23505" ? { handle: "That handle is already taken." } : undefined,
      draft,
    };
  }

  await upsertBlueprint(profile.id, draft);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/edit");
  if (profile.is_published) {
    revalidatePublicPortfolio(profile.handle);
    revalidatePublicPortfolio(draft.handle);
  }

  return { ok: true, message: "Your intake is saved. No AI has been called.", draft };
}

export async function generatePortfolioBlueprintAction(): Promise<AiGenerationActionResult> {
  const { profile } = await getAuthenticatedProfile();
  const { supabase, existing } = await getLatestBlueprint(profile.id);
  const currentJson = existing?.blueprint_json;
  const draft = normalizeDraft(readIntakeFromBlueprint(currentJson));
  const fieldErrors = validateDraft(draft, "submit");

  if (draft.status !== "submitted") {
    return {
      ok: false,
      message: "Submit the intake before generating an AI portfolio blueprint.",
    };
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      message: "The saved intake is missing required evidence. Return to the intake steps and complete it first.",
    };
  }

  const providerConfig = getAiProviderConfig();
  if (!providerConfig.ok) {
    return { ok: false, message: providerConfig.message };
  }

  const now = Date.now();
  const recentAttempts = readGenerationAttempts(currentJson).filter(
    (attempt) => now - attempt < AI_GENERATION_WINDOW_MS,
  );
  const latestAttempt = Math.max(0, ...recentAttempts);
  const cooldownRemaining = AI_GENERATION_COOLDOWN_MS - (now - latestAttempt);
  const existingBlueprint = readGeneratedBlueprint(currentJson);

  if (cooldownRemaining > 0) {
    return {
      ok: false,
      message: "Please wait a moment before generating again.",
      retryAfterSeconds: Math.ceil(cooldownRemaining / 1000),
      blueprint: existingBlueprint,
    };
  }

  if (recentAttempts.length >= AI_GENERATION_LIMIT) {
    return {
      ok: false,
      message: "You have reached the AI generation limit for today. Review the current blueprint or try tomorrow.",
      retryAfterSeconds: Math.ceil((AI_GENERATION_WINDOW_MS - (now - recentAttempts[0])) / 1000),
      blueprint: existingBlueprint,
    };
  }

  const attemptIso = new Date(now).toISOString();
  const attempts = [...recentAttempts.map((attempt) => new Date(attempt).toISOString()), attemptIso];
  const attemptPayload = createBlueprintPayload({
    current: currentJson,
    draft,
    generatedBlueprint: existingBlueprint,
    attempts,
  });

  let blueprintId = existing?.id;
  if (blueprintId) {
    const { error: attemptError } = await supabase
      .from("portfolio_blueprints")
      .update({ blueprint_json: attemptPayload as Json })
      .eq("id", blueprintId);

    if (attemptError) {
      return { ok: false, message: attemptError.message, blueprint: existingBlueprint };
    }
  } else {
    const { data: inserted, error: attemptError } = await supabase
      .from("portfolio_blueprints")
      .insert({
        profile_id: profile.id,
        blueprint_json: attemptPayload as Json,
      })
      .select("id")
      .single();

    if (attemptError) {
      return { ok: false, message: attemptError.message, blueprint: existingBlueprint };
    }
    blueprintId = inserted.id;
  }

  const generated = await callOpenAiCompatibleProvider(draft);
  if (!generated.ok) {
    return {
      ok: false,
      message: generated.message,
      blueprint: existingBlueprint,
    };
  }

  const finalPayload = createBlueprintPayload({
    current: attemptPayload,
    draft,
    generatedBlueprint: generated.blueprint,
    attempts,
  });
  const { error: saveError } = await supabase
    .from("portfolio_blueprints")
    .update({ blueprint_json: finalPayload as Json })
    .eq("id", blueprintId);

  if (saveError) {
    return { ok: false, message: saveError.message, blueprint: generated.blueprint };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/edit");
  if (profile.is_published) {
    revalidatePublicPortfolio(profile.handle);
  }

  return {
    ok: true,
    message: "AI blueprint generated. Review every claim before using it in your portfolio.",
    blueprint: generated.blueprint,
  };
}

export async function publishMoraPortfolioAction(): Promise<PublishActionResult> {
  const { supabase, profile } = await getAuthenticatedProfile();
  const { existing } = await getLatestBlueprint(profile.id);
  const draft = normalizeDraft(readIntakeFromBlueprint(existing?.blueprint_json));
  const fieldErrors: Record<string, string> = {};

  if (!draft.fullName) fieldErrors.fullName = "Add a name before publishing.";
  if (!draft.handle) fieldErrors.handle = "Choose a public handle before publishing.";
  if (!draft.role) fieldErrors.role = "Add a headline before publishing.";
  if (draft.handle) {
    const handleError = await assertHandleAvailable(draft.handle, profile.id);
    if (handleError) fieldErrors.handle = handleError;
  }

  const { count: portfolioItemCount, error: portfolioItemError } = await supabase
    .from("portfolio_items")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", profile.id);

  if (portfolioItemError) {
    return { ok: false, message: portfolioItemError.message };
  }

  if ((portfolioItemCount ?? 0) === 0 && draft.projects.length === 0) {
    fieldErrors.projects = "Add at least one portfolio item before publishing.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      message: "Complete the required publishing fields first.",
      fieldErrors,
    };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      handle: draft.handle,
      name: draft.fullName,
      headline: draft.role,
      bio: draft.bio,
      goal: draft.goal,
      avatar_url: draft.images[0]?.path ?? null,
      is_published: true,
    })
    .eq("id", profile.id);

  if (error) {
    return {
      ok: false,
      message: error.code === "23505" ? "That handle is already taken." : error.message,
    };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/publish");
  revalidatePublicPortfolio(profile.handle);
  revalidatePublicPortfolio(draft.handle);

  return {
    ok: true,
    message: "Your MORA is published.",
    handle: draft.handle,
    publicPath: `/${draft.handle}`,
  };
}

export async function unpublishMoraPortfolioAction(): Promise<PublishActionResult> {
  const { supabase, profile } = await getAuthenticatedProfile();

  const { error } = await supabase
    .from("profiles")
    .update({ is_published: false })
    .eq("id", profile.id);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/publish");
  revalidatePublicPortfolio(profile.handle);

  return {
    ok: true,
    message: "Your MORA is unpublished.",
    handle: profile.handle,
    publicPath: `/${profile.handle}`,
  };
}

