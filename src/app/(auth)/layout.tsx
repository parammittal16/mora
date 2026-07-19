export default function AuthLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="min-h-screen bg-[#f7f3ed] text-[#1d2b27]">
      <div className="mx-auto grid min-h-screen max-w-6xl items-center gap-12 px-5 py-10 md:grid-cols-[1fr_0.9fr] md:px-8">
        <section className="hidden h-[calc(100vh-5rem)] min-h-[560px] overflow-hidden rounded-lg bg-[#1d2b27] text-[#fffaf4] md:block">
          <div className="flex h-full flex-col justify-between p-10">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#e8c981]">
                MORA workspace
              </p>
              <p className="mt-6 max-w-md font-serif text-6xl leading-[0.9] tracking-[-0.065em]">
                Build the portfolio that actually sounds like you.
              </p>
            </div>
            <div className="grid gap-3">
              {["Curate your proof", "Edit every section", "Publish when ready"].map(
                (item) => (
                  <div
                    key={item}
                    className="flex items-center justify-between border-t border-white/12 py-4 text-sm"
                  >
                    <span>{item}</span>
                    <span className="text-[#e8c981]">↗</span>
                  </div>
                ),
              )}
            </div>
          </div>
        </section>
        <section className="flex justify-center">{children}</section>
      </div>
    </main>
  );
}
