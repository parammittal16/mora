const ArrowUpRight = () => (
  <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="1.8">
    <path d="M4.5 15.5 15.5 4.5M7 4.5h8.5V13" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const Spark = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.7">
    <path d="M12 2.75c.42 5.07 2.18 7.01 7.25 7.43-5.07.42-6.83 2.18-7.25 7.25-.42-5.07-2.18-6.83-7.25-7.25C9.82 9.76 11.58 7.82 12 2.75Z" strokeLinejoin="round" />
    <path d="M18.6 14.75c.16 1.94.83 2.68 2.77 2.84-1.94.16-2.61.9-2.77 2.84-.16-1.94-.83-2.68-2.77-2.84 1.94-.16 2.61-.9 2.77-2.84Z" strokeLinejoin="round" />
  </svg>
);

const Check = () => (
  <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="2">
    <path d="m4 10.5 3.65 3.4L16 5.75" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const steps = [
  ["01", "Bring your pieces", "Share the wins, images, captions and links that feel like you."],
  ["02", "Shape the narrative", "MORA gives your material a clear, credible flow — in your voice."],
  ["03", "Make it yours", "Fine-tune every word, reorder any section, then publish when ready."],
];

export default function Home() {
  return (
    <main className="overflow-hidden bg-[#f7f3ed] text-[#1d2b27]">
      <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
        <header className="flex h-20 items-center justify-between border-b border-[#1d2b27]/10 sm:h-24">
          <a href="#top" className="text-xl font-semibold tracking-[-0.08em] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d95c3b]">MORA</a>
          <nav aria-label="Main navigation" className="hidden items-center gap-8 text-sm text-[#1d2b27]/70 md:flex">
            <a className="transition-colors hover:text-[#d95c3b] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d95c3b]" href="#why-mora">Why MORA</a>
            <a className="transition-colors hover:text-[#d95c3b] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d95c3b]" href="#how-it-works">How it works</a>
            <a className="transition-colors hover:text-[#d95c3b] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d95c3b]" href="#made-for-you">Made for you</a>
            <a className="transition-colors hover:text-[#d95c3b] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d95c3b]" href="/sign-in">Sign in</a>
          </nav>
          <a href="/sign-up" className="inline-flex items-center gap-2 rounded-full bg-[#1d2b27] px-4 py-2.5 text-sm font-medium text-[#fffaf4] transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d95c3b] sm:px-5">
            Create my portfolio <ArrowUpRight />
          </a>
        </header>

        <section id="top" className="relative grid items-center gap-12 py-16 md:grid-cols-[minmax(0,1fr)_minmax(360px,0.82fr)] md:gap-16 md:py-24 lg:gap-24 lg:py-28">
          <div className="relative z-10 max-w-3xl">
            <p className="mb-6 flex items-center gap-2 text-xs font-semibold tracking-[0.16em] text-[#d95c3b] uppercase"><span className="h-px w-7 bg-[#d95c3b]" /> Your story, well told</p>
            <h1 className="max-w-3xl font-serif text-[clamp(3.2rem,7vw,6.8rem)] leading-[0.9] tracking-[-0.065em] text-[#1d2b27]">
              Turn your social proof into your <em className="font-serif font-normal text-[#d95c3b]">professional</em> presence.
            </h1>
            <p className="mt-8 max-w-xl text-lg leading-8 text-[#1d2b27]/72 sm:text-xl">
              An AI portfolio generator that starts with what you choose to share — then helps you turn it into work that feels unmistakably yours.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <a href="/sign-up" className="inline-flex items-center gap-2 rounded-full bg-[#d95c3b] px-6 py-3.5 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1d2b27]">
                Create my portfolio <ArrowUpRight />
              </a>
              <a href="#how-it-works" className="inline-flex items-center gap-2 rounded-full border border-[#1d2b27]/20 px-6 py-3.5 text-sm font-semibold transition-colors hover:border-[#1d2b27] hover:bg-white/40 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d95c3b]">
                See how it works <span aria-hidden="true">↓</span>
              </a>
            </div>
            <p className="mt-6 flex items-center gap-2 text-sm text-[#1d2b27]/60"><span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#e5eee2] text-[#4f735d]"><Check /></span> No scraping. No passwords. Always editable.</p>
          </div>

          <div className="relative mx-auto w-full max-w-[520px] md:mx-0">
            <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-[#e8c981]/55 blur-2xl" />
            <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-[#c6d9c6]/70 blur-2xl" />
            <div className="relative rotate-[2deg] rounded-[2rem] border border-[#1d2b27]/15 bg-[#fffdfa] p-3 shadow-[0_24px_70px_rgba(31,42,37,0.14)] sm:p-4">
              <div className="rounded-[1.4rem] border border-[#1d2b27]/10 bg-[#f0ede7] p-5 sm:p-7">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="grid h-11 w-11 place-items-center rounded-full bg-[#d95c3b] text-sm font-semibold text-white">AK</div>
                    <div><p className="font-semibold tracking-[-0.03em]">Aisha Khan</p><p className="text-xs text-[#1d2b27]/55">Brand designer · Mumbai</p></div>
                  </div>
                  <button aria-label="More portfolio options" className="rounded-full p-1.5 text-[#1d2b27]/55 transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-[#d95c3b]"><span aria-hidden="true">•••</span></button>
                </div>
                <div className="mt-8 grid gap-3 sm:grid-cols-[1.1fr_.9fr]">
                  <div className="min-h-52 rounded-2xl bg-[#244b43] p-5 text-[#fffaf4]">
                    <p className="text-xs tracking-[0.16em] text-[#e8c981] uppercase">Selected work</p>
                    <p className="mt-12 max-w-40 font-serif text-3xl leading-none tracking-[-0.05em]">Designing belonging.</p>
                    <div className="mt-5 flex -space-x-2"><span className="h-6 w-6 rounded-full border-2 border-[#244b43] bg-[#e8c981]" /><span className="h-6 w-6 rounded-full border-2 border-[#244b43] bg-[#d95c3b]" /><span className="h-6 w-6 rounded-full border-2 border-[#244b43] bg-[#c6d9c6]" /></div>
                  </div>
                  <div className="flex min-h-52 flex-col justify-between rounded-2xl bg-[#e8c981] p-5">
                    <Spark />
                    <div><p className="font-serif text-3xl leading-none tracking-[-0.06em]">12</p><p className="mt-1 text-xs text-[#1d2b27]/65">moments of proof,<br />one cohesive story</p></div>
                  </div>
                </div>
                <div className="mt-3 rounded-2xl bg-white p-4"><div className="flex items-center justify-between"><p className="text-sm font-medium">Built with intention</p><span className="text-xs text-[#d95c3b]">↗</span></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#e8e3da]"><div className="h-full w-[72%] rounded-full bg-[#d95c3b]" /></div></div>
              </div>
            </div>
            <div className="absolute -left-6 bottom-10 rotate-[-6deg] rounded-2xl border border-[#1d2b27]/10 bg-[#fffdfa] px-4 py-3 shadow-lg"><p className="text-[10px] font-semibold tracking-[0.13em] text-[#d95c3b] uppercase">Your input</p><p className="mt-0.5 text-sm font-medium">Every word stays yours</p></div>
          </div>
        </section>
      </div>

      <section id="why-mora" className="border-y border-[#1d2b27]/10 bg-[#1d2b27] text-[#fffaf4]">
        <div className="mx-auto grid max-w-[1440px] gap-10 px-5 py-16 sm:px-8 md:grid-cols-[.8fr_1.2fr] md:gap-16 md:px-12 md:py-24">
          <div><p className="text-xs font-semibold tracking-[0.16em] text-[#e8c981] uppercase">Your work deserves more</p><p className="mt-5 max-w-xs font-serif text-4xl leading-[0.95] tracking-[-0.055em] sm:text-5xl">The gap between sharing and showing up.</p></div>
          <div className="grid gap-7 sm:grid-cols-2"><p className="text-xl leading-8 text-[#fffaf4]/75">Your best work lives in fragments: a caption with heart, a kind message, a project you are proud of. Turning it into a considered presence can feel like a second job.</p><div className="border-l border-[#fffaf4]/20 pl-5"><p className="font-serif text-3xl tracking-[-0.05em] text-[#e8c981]">MORA makes room for the real story.</p><p className="mt-3 text-sm leading-6 text-[#fffaf4]/60">You bring the raw material. We help you make a portfolio that is clear, personal, and ready for what comes next.</p></div></div>
        </div>
      </section>

      <section id="how-it-works" className="mx-auto max-w-[1440px] px-5 py-20 sm:px-8 md:px-12 md:py-28">
        <div className="max-w-2xl"><p className="text-xs font-semibold tracking-[0.16em] text-[#d95c3b] uppercase">A thoughtful three-step process</p><h2 className="mt-4 font-serif text-5xl leading-[0.95] tracking-[-0.06em] sm:text-6xl">You stay in the <em className="font-normal text-[#d95c3b]">driver&apos;s seat.</em></h2></div>
        <div className="mt-14 grid border-t border-[#1d2b27]/15 md:grid-cols-3">{steps.map(([number, title, copy]) => <article key={number} className="border-b border-[#1d2b27]/15 py-8 md:border-b-0 md:border-r md:px-8 md:first:pl-0 md:last:border-r-0"><p className="text-sm text-[#d95c3b]">{number}</p><h3 className="mt-12 text-xl font-semibold tracking-[-0.04em]">{title}</h3><p className="mt-3 max-w-xs leading-7 text-[#1d2b27]/65">{copy}</p></article>)}</div>
      </section>

      <section id="made-for-you" className="bg-[#e5eee2]">
        <div className="mx-auto grid max-w-[1440px] gap-12 px-5 py-20 sm:px-8 md:grid-cols-[1fr_.9fr] md:items-center md:px-12 md:py-28">
          <div className="rounded-[2rem] bg-[#f7f3ed] p-6 shadow-[0_20px_60px_rgba(31,42,37,0.08)] sm:p-10"><div className="flex items-center justify-between border-b border-[#1d2b27]/10 pb-5"><p className="text-sm font-semibold">A portfolio, on your terms</p><Spark /></div><div className="mt-7 space-y-5">{["Built only from what you share", "Edit every detail before you publish", "A living home for your best work"].map((item) => <div key={item} className="flex items-center gap-4"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#d95c3b] text-white"><Check /></span><p className="text-lg tracking-[-0.025em]">{item}</p></div>)}</div></div>
          <div><p className="text-xs font-semibold tracking-[0.16em] text-[#4f735d] uppercase">Designed with boundaries</p><h2 className="mt-4 font-serif text-5xl leading-[0.95] tracking-[-0.06em] sm:text-6xl">Your reputation is not data to be harvested.</h2><p className="mt-7 max-w-xl text-lg leading-8 text-[#1d2b27]/68">MORA is consent-first by design. There is no scraping, no account connection, and no guessing. Just the stories and proof you decide belong in your next chapter.</p></div>
        </div>
      </section>

      <section id="start" className="bg-[#d95c3b] text-white"><div className="mx-auto max-w-[1440px] px-5 py-20 sm:px-8 md:px-12 md:py-28"><div className="max-w-4xl"><p className="text-xs font-semibold tracking-[0.16em] text-[#fff3e8]/80 uppercase">Make the introduction</p><h2 className="mt-4 font-serif text-[clamp(3.5rem,7vw,6.5rem)] leading-[0.9] tracking-[-0.07em]">Your next opportunity should meet the real you.</h2><p className="mt-7 max-w-xl text-lg leading-8 text-[#fff3e8]/85">Start with the work you have already done. Take the lead from there.</p><a href="/sign-up" className="mt-9 inline-flex items-center gap-2 rounded-full bg-[#1d2b27] px-6 py-3.5 text-sm font-semibold transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">Create my portfolio <ArrowUpRight /></a></div></div></section>

      <footer className="bg-[#1d2b27] text-[#fffaf4]"><div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-5 py-8 sm:px-8 md:flex-row md:items-center md:justify-between md:px-12"><p className="text-lg font-semibold tracking-[-0.08em]">MORA</p><p className="text-sm text-[#fffaf4]/50">Your work. Your words. Your next move.</p><a href="#top" className="text-sm text-[#fffaf4]/65 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#e8c981]">Back to top ↑</a></div></footer>
    </main>
  );
}
