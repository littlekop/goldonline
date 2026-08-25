import type { MetadataRoute } from "next";
import { getAllArticles } from "@/lib/articles";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const articles = getAllArticles();

  return [
    {
      url: SITE_URL,
      changeFrequency: "always",
      priority: 1,
    },
    {
      url: `${SITE_URL}/articles`,
      changeFrequency: "daily",
      priority: 0.8,
    },
    ...articles.map((a) => ({
      url: `${SITE_URL}/articles/${a.slug}`,
      lastModified: a.date,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
