"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
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

export type IntakeActionResult = {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string>;
  draft?: MoraIntakeDraft;
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
    .select("id, user_id, handle, name, goal")
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
    .select("id, user_id, handle, name, goal")
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

async function upsertBlueprint(profileId: string, draft: MoraIntakeDraft) {
  const supabase = await createSupabaseServerClient();
  const blueprint = {
    source: "mora_intake_v1",
    socialLinksPolicy: "display_only_never_scrape",
    intake: draft,
  };

  const { data: existing, error: selectError } = await supabase
    .from("portfolio_blueprints")
    .select("id")
    .eq("profile_id", profileId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (selectError) {
    throw new Error(selectError.message);
  }

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

  return { ok: true, message: "Your intake is saved. No AI has been called.", draft };
}
