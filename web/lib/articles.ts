import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const PUBLISHED_DIR = path.join(process.cwd(), "content", "published");

export type ArticleSource = { title: string; url: string };

export type ArticleMeta = {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  // Exact publish instant (ISO 8601, UTC) — used for sort order so multiple
  // articles published the same day (common with hourly auto-publishing)
  // show newest-first instead of falling back to file order. Optional only
  // for articles published before this field existed.
  publishedAt?: string;
  coverImage?: string;
  coverImageCredit?: string;
  sources: ArticleSource[];
  tags: string[];
};

export type Article = ArticleMeta & { content: string };

function readSlugs(): string[] {
  if (!fs.existsSync(PUBLISHED_DIR)) return [];
  return fs
    .readdirSync(PUBLISHED_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) => f.replace(/\.md$/, ""));
}

export function getAllArticles(): ArticleMeta[] {
  return readSlugs()
    .map((slug) => getArticle(slug))
    .filter((a): a is Article => a !== null)
    .map(({ content: _content, ...meta }) => meta)
    .sort((a, b) => {
      const aKey = a.publishedAt ?? a.date;
      const bKey = b.publishedAt ?? b.date;
      return aKey < bKey ? 1 : aKey > bKey ? -1 : 0;
    });
}

export function getArticle(slug: string): Article | null {
  const filePath = path.join(PUBLISHED_DIR, `${slug}.md`);
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(raw);
  return {
    slug,
    title: data.title ?? slug,
    excerpt: data.excerpt ?? "",
    date: data.date ?? "",
    publishedAt: data.publishedAt,
    coverImage: data.coverImage,
    coverImageCredit: data.coverImageCredit,
    sources: Array.isArray(data.sources) ? data.sources : [],
    tags: Array.isArray(data.tags) ? data.tags : [],
    content,
  };
}
