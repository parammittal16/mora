"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import {
  publishMoraPortfolioAction,
  unpublishMoraPortfolioAction,
  type PublishActionResult,
} from "../actions";

type PublishControlsProps = {
  handle: string;
  isPublished: boolean;
  publicUrl: string;
  publicPath: string;
};

function statusClasses(isPublished: boolean) {
  return isPublished
    ? "border-[#4f735d]/25 bg-[#e5eee2] text-[#244b43]"
    : "border-[#d95c3b]/25 bg-[#fff4ed] text-[#9f3f2b]";
}

export function PublishControls({
  handle,
  isPublished,
  publicUrl,
  publicPath,
}: PublishControlsProps) {
  const router = useRouter();
  const [published, setPublished] = useState(isPublished);
  const [currentHandle, setCurrentHandle] = useState(handle);
  const [currentPath, setCurrentPath] = useState(publicPath);
  const [message, setMessage] = useState(
    isPublished ? "This public portfolio is live." : "This portfolio is still a private draft.",
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [copyLabel, setCopyLabel] = useState("Copy link");
  const [isPending, startTransition] = useTransition();

  const resolvedPublicUrl = useMemo(() => {
    if (currentPath === publicPath) return publicUrl;

    try {
      return `${new URL(publicUrl).origin}${currentPath}`;
    } catch {
      return `${publicUrl.replace(/\/[^/]*$/, "")}${currentPath}`;
    }
  }, [currentPath, publicPath, publicUrl]);

  function applyResult(result: PublishActionResult, nextPublished: boolean) {
    setMessage(result.message);
    setFieldErrors(result.fieldErrors ?? {});

    if (!result.ok) return;

    setPublished(nextPublished);
    setCurrentHandle(result.handle ?? currentHandle);
    setCurrentPath(result.publicPath ?? currentPath);
    if (nextPublished) setShowSuccess(true);
    router.refresh();
  }

  function publish() {
    setShowConfirm(false);
    startTransition(async () => {
      const result = await publishMoraPortfolioAction();
      applyResult(result, true);
    });
  }

  function unpublish() {
    startTransition(async () => {
      const result = await unpublishMoraPortfolioAction();
      applyResult(result, false);
      if (result.ok) setShowSuccess(false);
    });
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(resolvedPublicUrl);
      setCopyLabel("Copied");
      window.setTimeout(() => setCopyLabel("Copy link"), 1800);
    } catch {
      setCopyLabel("Copy failed");
      window.setTimeout(() => setCopyLabel("Copy link"), 1800);
    }
  }

  const errors = Object.entries(fieldErrors);

  if (showSuccess && published) {
    return (
      <div className="rounded-lg border border-[#4f735d]/20 bg-white p-6">
        <div className="inline-flex rounded-full border border-[#4f735d]/25 bg-[#e5eee2] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#244b43]">
          Published
        </div>
        <h2 className="mt-5 font-serif text-4xl leading-none tracking-[-0.05em]">
          Your MORA is live.
        </h2>
        <p className="mt-4 leading-7 text-[#1d2b27]/68">
          Share this public URL or open the portfolio to review the published page.
        </p>
        <div className="mt-5 rounded-md border border-[#1d2b27]/10 bg-[#f7f3ed] px-4 py-3 text-sm font-semibold text-[#1d2b27]/78">
          {resolvedPublicUrl}
        </div>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={copyLink}
            className="rounded-md bg-[#1d2b27] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#283a35] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d95c3b]"
          >
            {copyLabel}
          </button>
          <a
            href={resolvedPublicUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-[#1d2b27]/15 px-5 py-3 text-center text-sm font-semibold transition-colors hover:bg-[#f7f3ed] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d95c3b]"
          >
            Open public portfolio
          </a>
          <button
            type="button"
            onClick={() => setShowSuccess(false)}
            className="rounded-md border border-[#1d2b27]/15 px-5 py-3 text-sm font-semibold transition-colors hover:bg-[#f7f3ed] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d95c3b]"
          >
            Back to publishing controls
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[#1d2b27]/10 bg-white p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold">Publishing status</p>
          <div className={`mt-3 inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${statusClasses(published)}`}>
            {published ? "Published" : "Draft"}
          </div>
        </div>
        <div className="rounded-md border border-[#1d2b27]/10 bg-[#f7f3ed] px-4 py-3 text-sm text-[#1d2b27]/70">
          <span className="font-semibold text-[#1d2b27]">Handle</span> {currentHandle}
        </div>
      </div>

      <p className="mt-5 leading-7 text-[#1d2b27]/65">
        Draft portfolios stay private. Published portfolios are available at the public URL below and are refreshed whenever public content changes.
      </p>
      <p className="mt-4 rounded-md bg-[#f7f3ed] px-4 py-3 text-sm font-semibold text-[#1d2b27]/76">
        {resolvedPublicUrl}
      </p>

      {errors.length > 0 && (
        <div className="mt-5 rounded-md border border-[#b93d25]/20 bg-[#fff4ed] p-4">
          <p className="text-sm font-semibold text-[#9f3f2b]">Before publishing</p>
          <ul className="mt-3 grid gap-2 text-sm text-[#1d2b27]/70">
            {errors.map(([field, error]) => (
              <li key={field}>{error}</li>
            ))}
          </ul>
          <Link href="/dashboard/edit" className="mt-4 inline-flex text-sm font-semibold text-[#b84f36]">
            Edit required fields
          </Link>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => setShowConfirm(true)}
          disabled={isPending}
          className="rounded-md bg-[#d95c3b] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#c94f31] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1d2b27] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {published ? "Republish changes" : "Publish portfolio"}
        </button>
        <button
          type="button"
          onClick={copyLink}
          disabled={!published}
          className="rounded-md border border-[#1d2b27]/15 px-5 py-3 text-sm font-semibold transition-colors hover:bg-[#f7f3ed] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d95c3b] disabled:cursor-not-allowed disabled:opacity-45"
        >
          {copyLabel}
        </button>
        <a
          href={resolvedPublicUrl}
          target="_blank"
          rel="noreferrer"
          aria-disabled={!published}
          className={`rounded-md border border-[#1d2b27]/15 px-5 py-3 text-center text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d95c3b] ${
            published ? "hover:bg-[#f7f3ed]" : "pointer-events-none opacity-45"
          }`}
        >
          Open public portfolio
        </a>
        {published && (
          <button
            type="button"
            onClick={unpublish}
            disabled={isPending}
            className="rounded-md border border-[#b93d25]/25 px-5 py-3 text-sm font-semibold text-[#b93d25] transition-colors hover:bg-[#fff4ed] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d95c3b] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Unpublish
          </button>
        )}
      </div>

      <p className="mt-5 text-sm leading-6 text-[#1d2b27]/55" aria-live="polite">
        {isPending ? "Updating publishing status..." : message}
      </p>

      {showConfirm && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#1d2b27]/45 px-5">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#d95c3b]">
              Confirm publish
            </p>
            <h2 className="mt-3 font-serif text-4xl leading-none tracking-[-0.05em]">
              Publish this portfolio?
            </h2>
            <p className="mt-4 leading-7 text-[#1d2b27]/68">
              This will make the latest saved public profile available at {resolvedPublicUrl}.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="rounded-md border border-[#1d2b27]/15 px-5 py-3 text-sm font-semibold transition-colors hover:bg-[#f7f3ed]"
              >
                Keep as draft
              </button>
              <button
                type="button"
                onClick={publish}
                disabled={isPending}
                className="rounded-md bg-[#d95c3b] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#c94f31] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Confirm publish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
