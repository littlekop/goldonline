import Link from "next/link";
import { C } from "@/lib/theme";
import { SITE_URL } from "@/lib/site";

type Crumb = { name: string; href?: string };

// Renders a visible breadcrumb trail and the matching BreadcrumbList
// structured data — the latter is what lets Google show the
// "site.com › ราคาทอง › ราคาทองวันนี้" trail under a search result
// instead of the raw URL.
export default function Breadcrumb({ items }: { items: Crumb[] }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      ...(item.href ? { item: `${SITE_URL}${item.href}` } : {}),
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <nav aria-label="Breadcrumb" className="font-body text-[13px] mb-3 flex flex-wrap items-center gap-1">
        {items.map((item, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && (
              <span aria-hidden="true" style={{ color: C.inkFaint }}>
                ›
              </span>
            )}
            {item.href ? (
              <Link href={item.href} className="underline" style={{ color: C.gold }}>
                {item.name}
              </Link>
            ) : (
              <span style={{ color: C.inkFaint }}>{item.name}</span>
            )}
          </span>
        ))}
      </nav>
    </>
  );
}
