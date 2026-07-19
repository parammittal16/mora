"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import {
  saveMoraDraftAction,
  submitMoraIntakeAction,
  uploadMoraDraftImagesAction,
  validateHandleAction,
  type IntakeActionResult,
  type IntakeLink,
  type MoraGoal,
  type MoraIntakeDraft,
} from "../actions";

type WizardProps = {
  initialDraft: MoraIntakeDraft;
  projectName: string;
};

type DraftKey = keyof MoraIntakeDraft;

const steps = [
  { title: "Identity", hint: "Name, handle, role" },
  { title: "Direction", hint: "Goal and bio" },
  { title: "Proof", hint: "Skills and wins" },
  { title: "Work", hint: "Projects and stories" },
  { title: "Images", hint: "Owned visuals" },
  { title: "Consent", hint: "Review and submit" },
];

const goalOptions: { value: MoraGoal; label: string; detail: string }[] = [
  { value: "get_hired", label: "Get hired", detail: "Recruiters and hiring teams" },
  { value: "win_clients", label: "Win clients", detail: "Trust, proof, and services" },
  { value: "showcase_work", label: "Showcase work", detail: "A polished body of work" },
  { value: "build_community", label: "Build community", detail: "Audience, belonging, momentum" },
];

const emptyDraft: MoraIntakeDraft = {
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

function createEmptyLink(): IntakeLink {
  return { label: "", url: "" };
}

function mergeDraft(draft: MoraIntakeDraft): MoraIntakeDraft {
  return {
    ...emptyDraft,
    ...draft,
    socialLinks: draft.socialLinks?.length ? draft.socialLinks : [createEmptyLink()],
    skills: draft.skills?.length ? draft.skills : [""],
    achievements: draft.achievements?.length ? draft.achievements : [""],
    projects: draft.projects?.length ? draft.projects : [""],
    stories: draft.stories?.length ? draft.stories : [""],
    images: draft.images ?? [],
  };
}

function cleanHandle(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-_]+/g, "")
    .slice(0, 30);
}

function listCompletion(items: string[]) {
  return items.map((item) => item.trim()).filter(Boolean).length;
}

function isResultWithDraft(result: IntakeActionResult): result is IntakeActionResult & {
  draft: MoraIntakeDraft;
} {
  return Boolean(result.draft);
}

export function MoraWizard({ initialDraft, projectName }: WizardProps) {
  const [draft, setDraft] = useState(() => mergeDraft(initialDraft));
  const [step, setStep] = useState(Math.min(initialDraft.currentStep || 0, steps.length - 1));
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("Draft autosaves as you move through the wizard.");
  const [handleStatus, setHandleStatus] = useState<"idle" | "checking" | "valid" | "invalid">(
    initialDraft.handle ? "valid" : "idle",
  );
  const [handleMessage, setHandleMessage] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isPending, startTransition] = useTransition();
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const publicUrl = useMemo(() => {
    const handle = draft.handle || "your-handle";
    return `https://${projectName}.vercel.app/${handle}`;
  }, [draft.handle, projectName]);

  const totalImages = draft.images.length + selectedFiles.length;
  const completedSteps = useMemo(
    () => [
      Boolean(draft.fullName && draft.handle && draft.role),
      Boolean(draft.goal && draft.bio.trim().length >= 24),
      Boolean(listCompletion(draft.skills) && listCompletion(draft.achievements)),
      Boolean(listCompletion(draft.projects) && listCompletion(draft.stories)),
      totalImages >= 4 && totalImages <= 8,
      draft.consent,
    ],
    [draft, totalImages],
  );
  const progress = Math.round(((completedSteps.filter(Boolean).length || step + 1) / steps.length) * 100);

  function updateDraft<Key extends DraftKey>(key: Key, value: MoraIntakeDraft[Key]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => {
      const next = { ...current };
      delete next[String(key)];
      return next;
    });
  }

  function updateHandle(value: string) {
    const handle = cleanHandle(value);
    updateDraft("handle", handle);
    if (!handle) {
      setHandleStatus("idle");
      setHandleMessage("");
    }
  }

  function updateList(key: "skills" | "achievements" | "projects" | "stories", index: number, value: string) {
    const next = [...draft[key]];
    next[index] = value;
    updateDraft(key, next);
  }

  function addListItem(key: "skills" | "achievements" | "projects" | "stories") {
    updateDraft(key, [...draft[key], ""]);
  }

  function removeListItem(key: "skills" | "achievements" | "projects" | "stories", index: number) {
    const next = draft[key].filter((_, itemIndex) => itemIndex !== index);
    updateDraft(key, next.length ? next : [""]);
  }

  function updateLink(index: number, key: keyof IntakeLink, value: string) {
    const links = [...draft.socialLinks];
    links[index] = { ...(links[index] || createEmptyLink()), [key]: value };
    updateDraft("socialLinks", links);
  }

  function addLink() {
    updateDraft("socialLinks", [...draft.socialLinks, createEmptyLink()]);
  }

  function removeLink(index: number) {
    const links = draft.socialLinks.filter((_, itemIndex) => itemIndex !== index);
    updateDraft("socialLinks", links.length ? links : [createEmptyLink()]);
  }

  function saveDraft(nextStep = step, quiet = false) {
    const payload = {
      ...draft,
      currentStep: nextStep,
      socialLinks: draft.socialLinks.filter((link) => link.label.trim() || link.url.trim()),
      skills: draft.skills.filter((item) => item.trim()),
      achievements: draft.achievements.filter((item) => item.trim()),
      projects: draft.projects.filter((item) => item.trim()),
      stories: draft.stories.filter((item) => item.trim()),
    };

    startTransition(async () => {
      let result: IntakeActionResult;

      if (selectedFiles.length > 0) {
        const formData = new FormData();
        formData.append("payload", JSON.stringify(payload));
        selectedFiles.forEach((file) => formData.append("images", file));
        result = await uploadMoraDraftImagesAction(formData);
      } else {
        result = await saveMoraDraftAction(payload);
      }

      setMessage(result.message);
      setFieldErrors(result.fieldErrors ?? {});
      if (isResultWithDraft(result)) {
        setDraft(mergeDraft(result.draft));
      }
      if (result.ok && selectedFiles.length > 0) {
        setSelectedFiles([]);
      }
      if (result.ok && !quiet) {
        setMessage("Draft saved. You can return and edit any step.");
      }
    });
  }

  function goToStep(nextStep: number) {
    const boundedStep = Math.min(Math.max(nextStep, 0), steps.length - 1);
    setStep(boundedStep);
    saveDraft(boundedStep, true);
  }

  function submitIntake() {
    const payload = {
      ...draft,
      socialLinks: draft.socialLinks.filter((link) => link.label.trim() || link.url.trim()),
      skills: draft.skills.filter((item) => item.trim()),
      achievements: draft.achievements.filter((item) => item.trim()),
      projects: draft.projects.filter((item) => item.trim()),
      stories: draft.stories.filter((item) => item.trim()),
    };
    const formData = new FormData();
    formData.append("payload", JSON.stringify(payload));
    selectedFiles.forEach((file) => formData.append("images", file));

    startTransition(async () => {
      const result = await submitMoraIntakeAction(formData);
      setMessage(result.message);
      setFieldErrors(result.fieldErrors ?? {});
      if (isResultWithDraft(result)) {
        setDraft(mergeDraft(result.draft));
      }
      if (result.ok) {
        setSelectedFiles([]);
        setStep(steps.length - 1);
      }
    });
  }

  useEffect(() => {
    if (!draft.handle) {
      return;
    }

    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);

    autosaveTimer.current = setTimeout(() => {
      setHandleStatus("checking");
      startTransition(async () => {
        const result = await validateHandleAction(draft.handle);
        setHandleStatus(result.ok ? "valid" : "invalid");
        setHandleMessage(result.message);
        if (result.handle !== draft.handle) {
          updateDraft("handle", result.handle);
        }
      });
    }, 450);

    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, [draft.handle]);

  return (
    <section className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="lg:sticky lg:top-6 lg:self-start">
        <div className="rounded-lg border border-[#1d2b27]/10 bg-[#fffaf4] p-4 shadow-sm shadow-[#1d2b27]/5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#d95c3b]">
            Create your MORA
          </p>
          <h1 className="mt-3 font-serif text-4xl leading-none tracking-[-0.04em]">
            Intake flow
          </h1>
          <div className="mt-5">
            <div className="flex items-center justify-between text-xs font-semibold text-[#1d2b27]/60">
              <span>{progress}% complete</span>
              <span>
                Step {step + 1}/{steps.length}
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#1d2b27]/10">
              <div
                className="h-full rounded-full bg-[#d95c3b] transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          <nav aria-label="Wizard steps" className="mt-5 grid gap-2">
            {steps.map((item, index) => (
              <button
                key={item.title}
                type="button"
                onClick={() => goToStep(index)}
                className={`rounded-md border px-3 py-3 text-left transition-colors ${
                  step === index
                    ? "border-[#1d2b27] bg-white"
                    : "border-[#1d2b27]/10 bg-transparent hover:bg-white/70"
                }`}
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold">{item.title}</span>
                  <span
                    className={`grid size-6 place-items-center rounded-full text-xs font-bold ${
                      completedSteps[index]
                        ? "bg-[#1d2b27] text-white"
                        : "bg-[#1d2b27]/8 text-[#1d2b27]/60"
                    }`}
                  >
                    {completedSteps[index] ? "ok" : index + 1}
                  </span>
                </span>
                <span className="mt-1 block text-xs text-[#1d2b27]/55">{item.hint}</span>
              </button>
            ))}
          </nav>
        </div>
      </aside>

      <div className="min-w-0 rounded-lg border border-[#1d2b27]/10 bg-white shadow-sm shadow-[#1d2b27]/5">
        <div className="border-b border-[#1d2b27]/10 bg-[#fffaf4] px-4 py-4 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#d95c3b]">
            {steps[step].hint}
          </p>
          <div className="mt-2 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <h2 className="font-serif text-4xl leading-none tracking-[-0.04em]">
              {steps[step].title}
            </h2>
            <div className="rounded-md border border-[#1d2b27]/10 bg-white px-3 py-2 text-sm text-[#1d2b27]/70">
              <span className="font-semibold text-[#1d2b27]">URL</span> {publicUrl}
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          {step === 0 && (
            <div className="grid gap-5">
              <TextField
                label="Full name"
                value={draft.fullName}
                error={fieldErrors.fullName}
                onChange={(value) => updateDraft("fullName", value)}
              />
              <div>
                <label className="text-sm font-semibold" htmlFor="handle">
                  Desired public handle
                </label>
                <div className="mt-2 flex rounded-md border border-[#1d2b27]/15 bg-[#f7f3ed] focus-within:border-[#d95c3b]">
                  <span className="hidden shrink-0 items-center border-r border-[#1d2b27]/10 px-3 text-sm text-[#1d2b27]/55 sm:flex">
                    {projectName}.vercel.app/
                  </span>
                  <input
                    id="handle"
                    value={draft.handle}
                    onChange={(event) => updateHandle(event.target.value)}
                    className="min-w-0 flex-1 bg-transparent px-3 py-3 text-base outline-none"
                    placeholder="alex-mora"
                    inputMode="url"
                  />
                </div>
                <p
                  className={`mt-2 text-sm ${
                    handleStatus === "invalid" ? "text-[#b93d25]" : "text-[#1d2b27]/60"
                  }`}
                >
                  {fieldErrors.handle || handleMessage || "Lowercase letters, numbers, hyphens, and underscores."}
                </p>
              </div>
              <TextField
                label="Role or profession"
                value={draft.role}
                error={fieldErrors.role}
                onChange={(value) => updateDraft("role", value)}
                placeholder="Product designer, founder, creative technologist..."
              />
            </div>
          )}

          {step === 1 && (
            <div className="grid gap-6">
              <div>
                <p className="text-sm font-semibold">Main goal</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {goalOptions.map((goal) => (
                    <button
                      key={goal.value}
                      type="button"
                      onClick={() => updateDraft("goal", goal.value)}
                      className={`rounded-lg border p-4 text-left transition-colors ${
                        draft.goal === goal.value
                          ? "border-[#d95c3b] bg-[#fff4ed]"
                          : "border-[#1d2b27]/10 bg-[#f7f3ed] hover:bg-[#fffaf4]"
                      }`}
                    >
                      <span className="block text-sm font-semibold">{goal.label}</span>
                      <span className="mt-1 block text-sm text-[#1d2b27]/60">{goal.detail}</span>
                    </button>
                  ))}
                </div>
                {fieldErrors.goal && <p className="mt-2 text-sm text-[#b93d25]">{fieldErrors.goal}</p>}
              </div>
              <TextArea
                label="Short bio"
                value={draft.bio}
                error={fieldErrors.bio}
                onChange={(value) => updateDraft("bio", value)}
                placeholder="A concise, human introduction to your work, taste, proof, and direction."
                rows={7}
              />
              <LinksEditor links={draft.socialLinks} onChange={updateLink} onAdd={addLink} onRemove={removeLink} />
            </div>
          )}

          {step === 2 && (
            <div className="grid gap-6">
              <ListEditor
                label="Skills"
                placeholder="Brand strategy"
                items={draft.skills}
                error={fieldErrors.skills}
                onChange={(index, value) => updateList("skills", index, value)}
                onAdd={() => addListItem("skills")}
                onRemove={(index) => removeListItem("skills", index)}
              />
              <ListEditor
                label="Achievements"
                placeholder="Grew a design newsletter to 18k readers"
                items={draft.achievements}
                error={fieldErrors.achievements}
                onChange={(index, value) => updateList("achievements", index, value)}
                onAdd={() => addListItem("achievements")}
                onRemove={(index) => removeListItem("achievements", index)}
              />
            </div>
          )}

          {step === 3 && (
            <div className="grid gap-6">
              <ListEditor
                label="Projects or experiences"
                placeholder="Led the launch of a creator analytics dashboard"
                items={draft.projects}
                error={fieldErrors.projects}
                onChange={(index, value) => updateList("projects", index, value)}
                onAdd={() => addListItem("projects")}
                onRemove={(index) => removeListItem("projects", index)}
                multiline
              />
              <ListEditor
                label="Captions, moments, or short stories for AI to understand later"
                placeholder="The client said this was the first dashboard their team actually opened every morning."
                items={draft.stories}
                error={fieldErrors.stories}
                onChange={(index, value) => updateList("stories", index, value)}
                onAdd={() => addListItem("stories")}
                onRemove={(index) => removeListItem("stories", index)}
                multiline
              />
            </div>
          )}

          {step === 4 && (
            <div className="grid gap-5">
              <div className="rounded-lg border border-dashed border-[#1d2b27]/25 bg-[#f7f3ed] p-5">
                <label className="block text-sm font-semibold" htmlFor="images">
                  Upload 4 to 8 user-owned images
                </label>
                <input
                  id="images"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  multiple
                  onChange={(event) => {
                    const files = Array.from(event.target.files ?? []).slice(0, Math.max(0, 8 - draft.images.length));
                    setSelectedFiles(files);
                    setFieldErrors((current) => {
                      const next = { ...current };
                      delete next.images;
                      return next;
                    });
                  }}
                  className="mt-4 w-full rounded-md border border-[#1d2b27]/15 bg-white px-3 py-3 text-sm"
                />
                <p className="mt-3 text-sm text-[#1d2b27]/60">
                  Selected now: {selectedFiles.length}. Already saved: {draft.images.length}. Total: {totalImages}/8.
                </p>
                {fieldErrors.images && <p className="mt-2 text-sm text-[#b93d25]">{fieldErrors.images}</p>}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {draft.images.map((image) => (
                  <div key={image.path} className="rounded-lg border border-[#1d2b27]/10 bg-[#fffaf4] p-4">
                    <p className="truncate text-sm font-semibold">{image.name}</p>
                    <p className="mt-1 text-xs text-[#1d2b27]/55">Saved securely in Supabase Storage</p>
                  </div>
                ))}
                {selectedFiles.map((file) => (
                  <div key={`${file.name}-${file.size}`} className="rounded-lg border border-[#d95c3b]/25 bg-[#fff4ed] p-4">
                    <p className="truncate text-sm font-semibold">{file.name}</p>
                    <p className="mt-1 text-xs text-[#1d2b27]/55">Ready to upload on submit</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="grid gap-5">
              <div className="rounded-lg border border-[#1d2b27]/10 bg-[#f7f3ed] p-5">
                <p className="text-sm font-semibold">Review</p>
                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                  <ReviewItem label="Name" value={draft.fullName || "Not set"} />
                  <ReviewItem label="Handle" value={draft.handle || "Not set"} />
                  <ReviewItem label="Role" value={draft.role || "Not set"} />
                  <ReviewItem label="Goal" value={goalOptions.find((goal) => goal.value === draft.goal)?.label || "Not set"} />
                  <ReviewItem label="Skills" value={`${listCompletion(draft.skills)} added`} />
                  <ReviewItem label="Images" value={`${totalImages} selected`} />
                </dl>
              </div>
              <label className="flex gap-3 rounded-lg border border-[#1d2b27]/10 bg-[#fffaf4] p-4 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={draft.consent}
                  onChange={(event) => updateDraft("consent", event.target.checked)}
                  className="mt-1 size-4 accent-[#d95c3b]"
                />
                <span>I own or have permission to use the content I submit.</span>
              </label>
              {fieldErrors.consent && <p className="text-sm text-[#b93d25]">{fieldErrors.consent}</p>}
              <p className="rounded-md bg-[#1d2b27] px-4 py-3 text-sm text-white">
                Social links are saved only as submitted links and are never scraped. AI is not called during this intake.
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-[#1d2b27]/10 bg-[#fffaf4] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="text-sm text-[#1d2b27]/65" aria-live="polite">
            {isPending ? "Saving..." : message}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => goToStep(step - 1)}
              disabled={step === 0 || isPending}
              className="rounded-md border border-[#1d2b27]/15 px-4 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-45"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => saveDraft(step)}
              disabled={isPending}
              className="rounded-md border border-[#1d2b27]/15 bg-white px-4 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
            >
              Save draft
            </button>
            {step < steps.length - 1 ? (
              <button
                type="button"
                onClick={() => goToStep(step + 1)}
                disabled={isPending}
                className="rounded-md bg-[#1d2b27] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                Continue
              </button>
            ) : (
              <button
                type="button"
                onClick={submitIntake}
                disabled={isPending}
                className="rounded-md bg-[#d95c3b] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                Submit intake
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function TextField({
  label,
  value,
  error,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  error?: string;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="text-sm font-semibold">
        {label}
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="mt-2 block w-full rounded-md border border-[#1d2b27]/15 bg-[#f7f3ed] px-3 py-3 text-base outline-none focus:border-[#d95c3b]"
        />
      </label>
      {error && <p className="mt-2 text-sm text-[#b93d25]">{error}</p>}
    </div>
  );
}

function TextArea({
  label,
  value,
  error,
  placeholder,
  rows = 4,
  onChange,
}: {
  label: string;
  value: string;
  error?: string;
  placeholder?: string;
  rows?: number;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="text-sm font-semibold">
        {label}
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          rows={rows}
          className="mt-2 block w-full resize-y rounded-md border border-[#1d2b27]/15 bg-[#f7f3ed] px-3 py-3 text-base leading-7 outline-none focus:border-[#d95c3b]"
        />
      </label>
      {error && <p className="mt-2 text-sm text-[#b93d25]">{error}</p>}
    </div>
  );
}

function ListEditor({
  label,
  items,
  placeholder,
  error,
  multiline = false,
  onChange,
  onAdd,
  onRemove,
}: {
  label: string;
  items: string[];
  placeholder: string;
  error?: string;
  multiline?: boolean;
  onChange: (index: number, value: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold">{label}</p>
        <button type="button" onClick={onAdd} className="rounded-md border border-[#1d2b27]/15 px-3 py-2 text-sm font-semibold">
          Add
        </button>
      </div>
      <div className="mt-3 grid gap-3">
        {items.map((item, index) => (
          <div key={index} className="flex gap-2">
            {multiline ? (
              <textarea
                value={item}
                onChange={(event) => onChange(index, event.target.value)}
                placeholder={placeholder}
                rows={3}
                className="min-w-0 flex-1 resize-y rounded-md border border-[#1d2b27]/15 bg-[#f7f3ed] px-3 py-3 text-base outline-none focus:border-[#d95c3b]"
              />
            ) : (
              <input
                value={item}
                onChange={(event) => onChange(index, event.target.value)}
                placeholder={placeholder}
                className="min-w-0 flex-1 rounded-md border border-[#1d2b27]/15 bg-[#f7f3ed] px-3 py-3 text-base outline-none focus:border-[#d95c3b]"
              />
            )}
            <button
              type="button"
              onClick={() => onRemove(index)}
              className="h-12 rounded-md border border-[#1d2b27]/15 px-3 text-sm font-semibold"
              aria-label={`Remove ${label} item`}
            >
              x
            </button>
          </div>
        ))}
      </div>
      {error && <p className="mt-2 text-sm text-[#b93d25]">{error}</p>}
    </div>
  );
}

function LinksEditor({
  links,
  onChange,
  onAdd,
  onRemove,
}: {
  links: IntakeLink[];
  onChange: (index: number, key: keyof IntakeLink, value: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Social links</p>
          <p className="mt-1 text-sm text-[#1d2b27]/60">Displayed only as links. Never scraped.</p>
        </div>
        <button type="button" onClick={onAdd} className="rounded-md border border-[#1d2b27]/15 px-3 py-2 text-sm font-semibold">
          Add
        </button>
      </div>
      <div className="mt-3 grid gap-3">
        {links.map((link, index) => (
          <div key={index} className="grid gap-2 rounded-lg border border-[#1d2b27]/10 bg-[#f7f3ed] p-3 sm:grid-cols-[0.8fr_1.2fr_auto]">
            <input
              value={link.label}
              onChange={(event) => onChange(index, "label", event.target.value)}
              placeholder="LinkedIn"
              className="rounded-md border border-[#1d2b27]/15 bg-white px-3 py-3 text-base outline-none focus:border-[#d95c3b]"
            />
            <input
              value={link.url}
              onChange={(event) => onChange(index, "url", event.target.value)}
              placeholder="https://..."
              inputMode="url"
              className="rounded-md border border-[#1d2b27]/15 bg-white px-3 py-3 text-base outline-none focus:border-[#d95c3b]"
            />
            <button type="button" onClick={() => onRemove(index)} className="rounded-md border border-[#1d2b27]/15 px-3 text-sm font-semibold">
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-semibold">{label}</dt>
      <dd className="mt-1 text-[#1d2b27]/65">{value}</dd>
    </div>
  );
}
