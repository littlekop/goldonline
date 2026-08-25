import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getAllArticles, getArticle } from "@/lib/articles";
import { C } from "@/lib/theme";
import { SITE_URL } from "@/lib/site";
import ShareButtons from "@/components/ShareButtons";

export function generateStaticParams() {
  return getAllArticles().map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) return {};
  return {
    title: article.title,
    description: article.excerpt,
    alternates: { canonical: `/articles/${slug}` },
    openGraph: {
      type: "article",
      publishedTime: article.date,
      images: article.coverImage ? [article.coverImage] : undefined,
    },
  };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) notFound();

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.title,
    description: article.excerpt,
    datePublished: article.date,
    dateModified: article.date,
    image: article.coverImage ? [`${SITE_URL}${article.coverImage}`] : undefined,
    author: { "@type": "Organization", name: "ราคาทองคำวันนี้" },
    publisher: {
      "@type": "Organization",
      name: "ราคาทองคำวันนี้",
      logo: { "@type": "ImageObject", url: `${SITE_URL}/opengraph-image` },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE_URL}/articles/${slug}` },
  };

  return (
    <div className="min-h-screen w-full" style={{ background: C.paper }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <header className="max-w-2xl mx-auto px-6 pt-10 pb-5" style={{ borderBottom: `2px solid ${C.ink}` }}>
        <Link href="/articles" className="font-body text-sm underline" style={{ color: C.gold }}>
          ← บทความทั้งหมด
        </Link>
        <div className="font-body text-[13px] mt-4" style={{ color: C.inkFaint }}>
          {article.date}
          {article.tags.length > 0 && " · " + article.tags.join(", ")}
        </div>
        <h1 className="font-display text-3xl font-medium tracking-tight mt-1" style={{ color: C.ink }}>
          {article.title}
        </h1>
      </header>

      <main className="max-w-2xl mx-auto px-6 pb-20 pt-8">
        {article.coverImage && (
          <figure className="mb-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={article.coverImage} alt={article.title} className="w-full" style={{ border: `1px solid ${C.line}` }} />
            {article.coverImageCredit && (
              <figcaption className="font-body text-[12px] mt-1.5" style={{ color: C.inkFaint }}>
                {article.coverImageCredit}
              </figcaption>
            )}
          </figure>
        )}

        <article
          className="font-body text-base leading-relaxed article-body"
          style={{ color: C.ink }}
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{article.content}</ReactMarkdown>
        </article>

        <div className="mt-8 pt-6" style={{ borderTop: `1px solid ${C.line}` }}>
          <ShareButtons url={`${SITE_URL}/articles/${slug}`} title={article.title} />
        </div>

        {article.sources.length > 0 && (
          <div className="mt-10 pt-6" style={{ borderTop: `1px solid ${C.line}` }}>
            <div className="font-body text-[13px] font-semibold uppercase tracking-[0.14em] mb-2" style={{ color: C.inkSoft }}>
              แหล่งข่าวอ้างอิง
            </div>
            <ul className="font-body text-sm space-y-1">
              {article.sources.map((s) => (
                <li key={s.url}>
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="underline" style={{ color: C.gold }}>
                    {s.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}
