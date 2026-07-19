import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  getPublicPortfolio,
  getSeededPublicPortfolioParams,
  type PublicPortfolio,
  type PublicPortfolioLens,
} from "@/lib/public-portfolio";

type PortfolioPageProps = {
  params: Promise<{ handle: string }>;
  searchParams?: Promise<{
    lens?: string | string[];
  }>;
};

const lensCopy: Record<
  PublicPortfolioLens,
  {
    eyebrow: string;
    cta: string;
    secondaryCta: string;
  }
> = {
  default: {
    eyebrow: "Public portfolio",
    cta: "Start a collaboration",
    secondaryCta: "Explore proof",
  },
  recruiter: {
    eyebrow: "Recruiter view",
    cta: "Discuss a role",
    secondaryCta: "Review strengths",
  },
};

export const dynamicParams = true;
export const revalidate = 3600;

export async function generateStaticParams() {
  return getSeededPublicPortfolioParams();
}

function readLens(value: string | string[] | undefined): PublicPortfolioLens {
  const lens = Array.isArray(value) ? value[0] : value;
  return lens === "recruiter" ? "recruiter" : "default";
}

function absolutePortfolioUrl(handle: string) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  return siteUrl ? `${siteUrl}/${handle}` : `/${handle}`;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getContactLink(portfolio: PublicPortfolio) {
  return portfolio.socialLinks[0]?.url || "#social-links";
}

function getHeadline(portfolio: PublicPortfolio, lens: PublicPortfolioLens) {
  if (lens === "recruiter") {
    const role = portfolio.profile.headline || portfolio.skills.slice(0, 2).join(" and ");
    return `${portfolio.profile.name || portfolio.profile.handle} is ready for ${role || "high-trust work"}.`;
  }

  return portfolio.headline;
}

export async function generateMetadata({ params }: PortfolioPageProps): Promise<Metadata> {
  const { handle } = await params;
  const portfolio = await getPublicPortfolio(handle);

  if (!portfolio) {
    return {
      title: "Portfolio not found | MORA",
      robots: { index: false, follow: false },
    };
  }

  const title = `${portfolio.profile.name || portfolio.profile.handle} | MORA`;
  const description =
    portfolio.shortBio ||
    portfolio.headline ||
    `Public portfolio for ${portfolio.profile.name || portfolio.profile.handle}.`;
  const url = absolutePortfolioUrl(portfolio.profile.handle);
  const firstImage = portfolio.gallery.find((image) => image.url)?.url;

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      url,
      type: "profile",
      siteName: "MORA",
      images: firstImage ? [{ url: firstImage, alt: portfolio.profile.name || portfolio.profile.handle }] : undefined,
    },
    twitter: {
      card: firstImage ? "summary_large_image" : "summary",
      title,
      description,
      images: firstImage ? [firstImage] : undefined,
    },
  };
}

export default async function PortfolioPage({ params, searchParams }: PortfolioPageProps) {
  const [{ handle }, resolvedSearchParams] = await Promise.all([params, searchParams]);
  const portfolio = await getPublicPortfolio(handle);

  if (!portfolio) notFound();

  const lens = readLens(resolvedSearchParams?.lens);
  const copy = lensCopy[lens];
  const name = portfolio.profile.name || portfolio.profile.handle;
  const headline = getHeadline(portfolio, lens);
  const orderedSections =
    lens === "recruiter"
      ? ["strengths", "projects", "about", "gallery", "social"]
      : ["about", "strengths", "projects", "gallery", "social"];
  const contactLink = getContactLink(portfolio);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name,
    url: absolutePortfolioUrl(portfolio.profile.handle),
    jobTitle: portfolio.profile.headline,
    description: portfolio.shortBio,
    sameAs: portfolio.socialLinks.map((link) => link.url),
  };

  const sections = {
    about: (
      <section id="about" className="bg-[#fffaf4]">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-16 sm:px-8 md:grid-cols-[0.8fr_1.2fr] md:py-24">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#b84f36]">
              About
            </p>
            <h2 className="mt-4 font-serif text-4xl leading-none tracking-[-0.05em] sm:text-5xl">
              The story behind the work.
            </h2>
          </div>
          <div className="grid gap-6 text-lg leading-8 text-[#1d2b27]/72">
            <p>{portfolio.shortBio || portfolio.profile.bio || "This portfolio is grounded in submitted work, proof, and personal context."}</p>
            {portfolio.voice && <p className="text-base leading-7 text-[#1d2b27]/58">Voice: {portfolio.voice}</p>}
            {portfolio.targetAudience && (
              <p className="rounded-lg border border-[#1d2b27]/10 bg-[#f7f3ed] p-5 text-base leading-7 text-[#1d2b27]/68">
                Built for {portfolio.targetAudience}
              </p>
            )}
          </div>
        </div>
      </section>
    ),
    strengths: (
      <section id="proof" className="bg-[#e5eee2]">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 md:py-24">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#4f735d]">
              Strengths and proof
            </p>
            <h2 className="mt-4 font-serif text-4xl leading-none tracking-[-0.05em] sm:text-5xl">
              Clear signals, backed by evidence.
            </h2>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {portfolio.strengths.slice(0, 6).map((strength, index) => (
              <article key={`${strength.title}-${index}`} className="rounded-lg border border-[#1d2b27]/10 bg-white p-6">
                <p className="text-sm font-semibold text-[#b84f36]">0{index + 1}</p>
                <h3 className="mt-5 text-2xl font-semibold tracking-[-0.04em]">{strength.title}</h3>
                {strength.explanation && <p className="mt-3 leading-7 text-[#1d2b27]/68">{strength.explanation}</p>}
                {strength.evidence && (
                  <p className="mt-5 border-l-2 border-[#d95c3b] pl-4 text-sm leading-6 text-[#1d2b27]/62">
                    {strength.evidence}
                  </p>
                )}
              </article>
            ))}
          </div>
        </div>
      </section>
    ),
    projects: (
      <section id="projects" className="bg-[#f7f3ed]">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 md:py-24">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#b84f36]">
                Featured projects
              </p>
              <h2 className="mt-4 font-serif text-4xl leading-none tracking-[-0.05em] sm:text-5xl">
                Work worth opening first.
              </h2>
            </div>
            {portfolio.skills.length > 0 && (
              <div className="flex max-w-xl flex-wrap gap-2">
                {portfolio.skills.slice(0, 8).map((skill) => (
                  <span key={skill} className="rounded-full border border-[#1d2b27]/12 bg-white px-3 py-1.5 text-sm text-[#1d2b27]/70">
                    {skill}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="mt-10 grid gap-5">
            {portfolio.projects.slice(0, 5).map((project, index) => (
              <article key={`${project.title}-${index}`} className="grid gap-5 rounded-lg border border-[#1d2b27]/10 bg-white p-5 md:grid-cols-[0.8fr_1.2fr] md:p-6">
                <div className="min-h-48 overflow-hidden rounded-md bg-[#1d2b27]">
                  {project.imageUrl ? (
                    <img src={project.imageUrl} alt="" className="h-full min-h-48 w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="flex h-full min-h-48 items-end p-5 text-[#fffaf4]">
                      <p className="font-serif text-3xl leading-none tracking-[-0.05em]">Project {index + 1}</p>
                    </div>
                  )}
                </div>
                <div className="flex flex-col justify-between gap-6">
                  <div>
                    <h3 className="text-3xl font-semibold tracking-[-0.05em]">{project.title}</h3>
                    {project.description && <p className="mt-4 leading-7 text-[#1d2b27]/68">{project.description}</p>}
                    {project.evidence && <p className="mt-4 text-sm leading-6 text-[#1d2b27]/58">{project.evidence}</p>}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {project.skills.slice(0, 6).map((skill) => (
                      <span key={skill} className="rounded-full bg-[#e5eee2] px-3 py-1.5 text-xs font-semibold text-[#1d2b27]/70">
                        {skill}
                      </span>
                    ))}
                    {project.url && (
                      <a href={project.url} className="ml-auto text-sm font-semibold text-[#b84f36]" rel="noreferrer" target="_blank">
                        View project
                      </a>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    ),
    gallery: (
      <section id="gallery" className="bg-[#1d2b27] text-[#fffaf4]">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 md:py-24">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#e8c981]">
              Image gallery
            </p>
            <h2 className="mt-4 font-serif text-4xl leading-none tracking-[-0.05em] sm:text-5xl">
              Visual context from the work.
            </h2>
          </div>
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {portfolio.gallery.map((image, index) => (
              <figure key={`${image.name}-${index}`} className="overflow-hidden rounded-lg border border-white/10 bg-white/8">
                {image.url ? (
                  <img src={image.url} alt={image.name} className="aspect-[4/5] w-full object-cover" loading="lazy" />
                ) : (
                  <div className="grid aspect-[4/5] place-items-center p-5 text-center text-sm text-[#fffaf4]/60">
                    {image.name}
                  </div>
                )}
              </figure>
            ))}
          </div>
        </div>
      </section>
    ),
    social: (
      <section id="social-links" className="bg-[#fffaf4]">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 md:py-24">
          <div className="grid gap-8 rounded-lg border border-[#1d2b27]/10 bg-[#f7f3ed] p-6 md:grid-cols-[1fr_auto] md:items-center md:p-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#b84f36]">
                Contact
              </p>
              <h2 className="mt-4 font-serif text-4xl leading-none tracking-[-0.05em]">
                Open to the right next conversation.
              </h2>
              <div className="mt-6 flex flex-wrap gap-3">
                {portfolio.socialLinks.map((link) => (
                  <a key={link.url} href={link.url} rel="noreferrer" target="_blank" className="rounded-full border border-[#1d2b27]/12 bg-white px-4 py-2 text-sm font-semibold">
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
            <a href={contactLink} className="inline-flex justify-center rounded-full bg-[#d95c3b] px-6 py-3.5 text-sm font-semibold text-white">
              {copy.cta}
            </a>
          </div>
        </div>
      </section>
    ),
  };

  return (
    <main className="min-h-screen bg-[#f7f3ed] text-[#1d2b27]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <section className="relative overflow-hidden bg-[#f7f3ed]">
        <div className="mx-auto grid min-h-[92vh] max-w-6xl gap-10 px-5 py-8 sm:px-8 md:grid-cols-[1.08fr_0.92fr] md:items-center md:py-14">
          <div className="pb-6">
            <p className="mb-6 text-xs font-semibold uppercase tracking-[0.16em] text-[#b84f36]">
              {copy.eyebrow}
            </p>
            <h1 className="font-serif text-[clamp(3.1rem,8vw,7.1rem)] leading-[0.88] tracking-[-0.065em]">
              {headline}
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-[#1d2b27]/70">
              {portfolio.shortBio || portfolio.profile.bio || `A published MORA profile for ${name}.`}
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <a href={contactLink} className="inline-flex justify-center rounded-full bg-[#1d2b27] px-6 py-3.5 text-sm font-semibold text-[#fffaf4]">
                {copy.cta}
              </a>
              <a href={lens === "recruiter" ? "#proof" : "#projects"} className="inline-flex justify-center rounded-full border border-[#1d2b27]/16 px-6 py-3.5 text-sm font-semibold">
                {copy.secondaryCta}
              </a>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg bg-[#1d2b27] p-6 text-[#fffaf4] sm:row-span-2">
              <div className="grid size-16 place-items-center rounded-full bg-[#d95c3b] text-xl font-semibold">
                {initials(name)}
              </div>
              <p className="mt-16 text-sm uppercase tracking-[0.16em] text-[#e8c981]">Meet</p>
              <p className="mt-3 font-serif text-5xl leading-none tracking-[-0.06em]">{name}</p>
              {portfolio.profile.headline && <p className="mt-5 leading-7 text-[#fffaf4]/70">{portfolio.profile.headline}</p>}
            </div>
            {(portfolio.gallery.slice(0, 2).length ? portfolio.gallery.slice(0, 2) : [{ name, url: null }]).map((image, index) => (
              <div key={`${image.name}-${index}`} className="overflow-hidden rounded-lg bg-white">
                {image.url ? (
                  <img src={image.url} alt={image.name} className="aspect-[4/3] h-full w-full object-cover md:aspect-auto" />
                ) : (
                  <div className="grid aspect-[4/3] place-items-center bg-[#e5eee2] p-5 text-center text-sm text-[#1d2b27]/60">
                    {image.name}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {orderedSections.map((section) => (
        <div key={section}>{sections[section as keyof typeof sections]}</div>
      ))}
    </main>
  );
}
