#!/usr/bin/env node
// Moves a reviewed draft from content/drafts/<slug>.md to content/published/<slug>.md.
// Does not edit content — the human review already happened before running this.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const slug = process.argv[2];
if (!slug) {
  console.error("Usage: node scripts/publish-draft.mjs <slug>");
  process.exit(1);
}

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const src = path.join(root, "content", "drafts", `${slug}.md`);
const dest = path.join(root, "content", "published", `${slug}.md`);

if (!fs.existsSync(src)) {
  console.error(`Draft not found: ${src}`);
  process.exit(1);
}
if (fs.existsSync(dest)) {
  console.error(`A published article with slug "${slug}" already exists.`);
  process.exit(1);
}

fs.renameSync(src, dest);
console.log(`Published: content/published/${slug}.md`);
console.log(`It will appear at /articles/${slug}`);
