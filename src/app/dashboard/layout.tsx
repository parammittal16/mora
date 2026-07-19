import Link from "next/link";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

const navigation = [
  { href: "/dashboard", label: "My Portfolio" },
  { href: "/dashboard/edit", label: "Edit" },
  { href: "/dashboard/publish", label: "Publish" },
];

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/sign-in?next=/dashboard");
  }

  return (
    <main className="min-h-screen bg-[#f7f3ed] text-[#1d2b27]">
      <header className="border-b border-[#1d2b27]/10 bg-[#fffaf4]/80">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-5 sm:px-8 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="text-xl font-semibold tracking-[-0.08em]">
              MORA
            </Link>
          </div>
          <nav aria-label="Dashboard navigation" className="flex flex-wrap gap-2">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-2 text-sm font-medium text-[#1d2b27]/70 transition-colors hover:bg-[#1d2b27]/6 hover:text-[#1d2b27] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d95c3b]"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <form action="/auth/logout" method="post">
            <button
              type="submit"
              className="rounded-md border border-[#1d2b27]/15 px-3 py-2 text-sm font-semibold transition-colors hover:border-[#1d2b27]/35 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d95c3b]"
            >
              Log out
            </button>
          </form>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">{children}</div>
    </main>
  );
}
