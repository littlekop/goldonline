#!/usr/bin/env node
// Posts a published article to a Facebook Page via the Graph API.
// Requires FACEBOOK_PAGE_ID and FACEBOOK_PAGE_ACCESS_TOKEN in web/.env.local
// (see web/.env.local.example for how to get them). If either is missing,
// this script exits quietly (code 0, no output) so callers can treat "not
// configured" as a normal skip rather than an error.
//
// Usage: node scripts/post-to-facebook.mjs <slug>

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";

const webRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

// Self-load web/.env.local so this works whether or not the caller
// remembered `node --env-file=.env.local` — a missing flag here has
// silently no-op'd Facebook posting before (agent docs said "not
// configured" even with real credentials in the file).
const envPath = path.join(webRoot, ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
  }
}

const slug = process.argv[2];
if (!slug) {
  console.error("Usage: node scripts/post-to-facebook.mjs <slug>");
  process.exit(1);
}

const pageId = process.env.FACEBOOK_PAGE_ID;
const pageToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
if (!pageId || !pageToken) {
  console.log(JSON.stringify({ skipped: true, reason: "FACEBOOK_PAGE_ID / FACEBOOK_PAGE_ACCESS_TOKEN not set" }));
  process.exit(0);
}

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://your-domain.com").replace(/\/$/, "");

const articlePath = path.join(webRoot, "content", "published", `${slug}.md`);
if (!fs.existsSync(articlePath)) {
  console.error(`Published article not found: ${articlePath}`);
  process.exit(1);
}
const { data } = matter(fs.readFileSync(articlePath, "utf-8"));
const title = data.title || slug;
const excerpt = data.excerpt || "";
const coverImage = data.coverImage ? `${siteUrl}${data.coverImage}` : null;
const articleUrl = `${siteUrl}/articles/${slug}`;

const message = [
  title,
  "",
  excerpt,
  "",
  `อ่านต่อได้ที่: ${articleUrl}`,
  "",
  "#ทอง #ทองคำ #ราคาทอง #ราคาทองคำ #ราคาทองวันนี้ #ลงทุนทอง #ออมทอง #ทองคำแท่ง",
].join("\n");

const GRAPH_API = "https://graph.facebook.com/v19.0";

async function postWithPhoto() {
  const res = await fetch(`${GRAPH_API}/${pageId}/photos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: coverImage,
      caption: message,
      access_token: pageToken,
    }),
  });
  return res;
}

async function postTextOnly() {
  const res = await fetch(`${GRAPH_API}/${pageId}/feed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      link: articleUrl,
      access_token: pageToken,
    }),
  });
  return res;
}

const res = coverImage ? await postWithPhoto() : await postTextOnly();
const data2 = await res.json();

if (!res.ok) {
  console.error(`Facebook post failed: ${res.status} ${JSON.stringify(data2)}`);
  process.exit(1);
}

console.log(JSON.stringify({ posted: true, facebookPostId: data2.post_id || data2.id, articleUrl }, null, 2));
