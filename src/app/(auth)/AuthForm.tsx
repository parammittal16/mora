"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type AuthMode = "sign-in" | "sign-up";

type AuthFormProps = {
  mode: AuthMode;
};

function getAuthCallbackUrl() {
  return `${window.location.origin}/auth/callback`;
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";
  const errorMessage = searchParams.get("error");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(errorMessage);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const supabase = createSupabaseBrowserClient();
  const isSignUp = mode === "sign-up";

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus(null);
    setMagicLinkSent(false);

    const redirectTo = `${getAuthCallbackUrl()}?next=${encodeURIComponent(next)}`;
    const result = isSignUp
      ? await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: redirectTo },
        })
      : await supabase.auth.signInWithPassword({ email, password });

    setIsSubmitting(false);

    if (result.error) {
      setStatus(result.error.message);
      return;
    }

    if (isSignUp && !result.data.session) {
      setStatus("Check your email to confirm your account, then come back to MORA.");
      return;
    }

    router.replace(next);
    router.refresh();
  }

  async function handleMagicLink() {
    if (!email) {
      setStatus("Enter your email first, then we can send a magic link.");
      return;
    }

    setIsSubmitting(true);
    setStatus(null);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${getAuthCallbackUrl()}?next=${encodeURIComponent(next)}`,
        shouldCreateUser: true,
      },
    });

    setIsSubmitting(false);

    if (error) {
      setStatus(error.message);
      return;
    }

    setMagicLinkSent(true);
    setStatus("Magic link sent. Open it on this device to continue to your dashboard.");
  }

  async function handleGoogleSignIn() {
    setIsSubmitting(true);
    setStatus(null);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${getAuthCallbackUrl()}?next=${encodeURIComponent(next)}`,
      },
    });

    if (error) {
      setIsSubmitting(false);
      setStatus(error.message);
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-8">
        <Link href="/" className="text-xl font-semibold tracking-[-0.08em]">
          MORA
        </Link>
        <h1 className="mt-10 font-serif text-5xl leading-none tracking-[-0.06em] text-[#1d2b27]">
          {isSignUp ? "Create your account." : "Welcome back."}
        </h1>
        <p className="mt-4 leading-7 text-[#1d2b27]/65">
          {isSignUp
            ? "Start shaping a professional portfolio from the proof you choose to share."
            : "Sign in to edit, preview, and publish your MORA portfolio."}
        </p>
      </div>

      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={isSubmitting}
        className="flex h-12 w-full items-center justify-center gap-3 rounded-md border border-[#1d2b27]/15 bg-white px-4 text-sm font-semibold text-[#1d2b27] shadow-sm transition-colors hover:border-[#1d2b27]/35 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d95c3b] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="grid h-5 w-5 place-items-center rounded-full border border-[#1d2b27]/20 text-xs font-bold">
          G
        </span>
        Continue with Google
      </button>

      <div className="my-7 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#1d2b27]/45">
        <span className="h-px flex-1 bg-[#1d2b27]/12" />
        or
        <span className="h-px flex-1 bg-[#1d2b27]/12" />
      </div>

      <form onSubmit={handlePasswordSubmit} className="space-y-4">
        <label className="block">
          <span className="text-sm font-medium text-[#1d2b27]/75">Email</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            autoComplete="email"
            className="mt-2 h-12 w-full rounded-md border border-[#1d2b27]/15 bg-white px-4 text-base outline-none transition-colors focus:border-[#d95c3b]"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-[#1d2b27]/75">Password</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={6}
            autoComplete={isSignUp ? "new-password" : "current-password"}
            className="mt-2 h-12 w-full rounded-md border border-[#1d2b27]/15 bg-white px-4 text-base outline-none transition-colors focus:border-[#d95c3b]"
          />
        </label>

        <button
          type="submit"
          disabled={isSubmitting}
          className="h-12 w-full rounded-md bg-[#d95c3b] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#c94f31] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1d2b27] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Working..." : isSignUp ? "Create account" : "Sign in"}
        </button>
      </form>

      <button
        type="button"
        onClick={handleMagicLink}
        disabled={isSubmitting || magicLinkSent}
        className="mt-3 h-12 w-full rounded-md border border-[#1d2b27]/15 px-4 text-sm font-semibold text-[#1d2b27] transition-colors hover:border-[#1d2b27]/35 hover:bg-white/50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d95c3b] disabled:cursor-not-allowed disabled:opacity-60"
      >
        Email me a magic link
      </button>

      {status ? (
        <p className="mt-4 rounded-md bg-white px-4 py-3 text-sm leading-6 text-[#1d2b27]/70">
          {status}
        </p>
      ) : null}

      <p className="mt-8 text-sm text-[#1d2b27]/62">
        {isSignUp ? "Already have an account?" : "New to MORA?"}{" "}
        <Link
          href={`${isSignUp ? "/sign-in" : "/sign-up"}?next=${encodeURIComponent(next)}`}
          className="font-semibold text-[#d95c3b] underline-offset-4 hover:underline"
        >
          {isSignUp ? "Sign in" : "Create an account"}
        </Link>
      </p>
    </div>
  );
}
