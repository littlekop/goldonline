#!/usr/bin/env node
// Searches Pexels (free stock photos, no attribution legally required but we
// credit anyway as good practice) for `query`, downloads the top result into
// public/images/articles/<slug>.<ext>, and prints the credit line + saved path
// as JSON so a caller (e.g. the gold-news-writer agent) can put it straight
// into an article's frontmatter.
//
// Usage: node scripts/fetch-pexels-image.mjs "<search query>" <slug>
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

const [, , query, slug] = process.argv;
if (!query || !slug) {
  console.error("Usage: node scripts/fetch-pexels-image.mjs \"<search query>\" <slug>");
  process.exit(1);
}

const apiKey = process.env.PEXELS_API_KEY;
if (!apiKey) {
  console.error("PEXELS_API_KEY is not set — see web/.env.local.example");
  process.exit(1);
}

const searchRes = await fetch(
  `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`,
  { headers: { Authorization: apiKey } }
);
if (!searchRes.ok) {
  console.error(`Pexels search failed: ${searchRes.status}`);
  process.exit(1);
}
const searchData = await searchRes.json();
const photo = searchData?.photos?.[0];
if (!photo) {
  console.error(`No Pexels results for query: ${query}`);
  process.exit(1);
}

const imageUrl = photo.src.large;
const ext = path.extname(new URL(imageUrl).pathname) || ".jpg";
const outDir = path.join(webRoot, "public", "images", "articles");
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, `${slug}${ext}`);

const imgRes = await fetch(imageUrl);
if (!imgRes.ok) {
  console.error(`Image download failed: ${imgRes.status}`);
  process.exit(1);
}
const buffer = Buffer.from(await imgRes.arrayBuffer());
fs.writeFileSync(outPath, buffer);

console.log(
  JSON.stringify(
    {
      coverImage: `/images/articles/${slug}${ext}`,
      coverImageCredit: `Photo by ${photo.photographer} on Pexels`,
      sourcePage: photo.url,
    },
    null,
    2
  )
);
