#!/usr/bin/env node
// Generates a branded article-cover image: a relevant Pexels photo as the
// background (varies per article), a uniform dark scrim for legibility, our
// logo/site name, a category tag, a green/red/gold trend-chart motif picked
// by the article's price direction, and the headline — replacing plain
// Pexels stock photos as the cover image source.
//
// Usage: node scripts/generate-article-cover.mjs "<title>" <slug> "<bg query>" <up|down|flat> ["<tag>"]
// Prints JSON: {coverImage, coverImageCredit, sourcePage} — same shape as
// the old fetch-pexels-image.mjs, so it drops straight into frontmatter.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const React = require("react");
const { ImageResponse } = require("next/og");

const webRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

const envPath = path.join(webRoot, ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
  }
}

const [, , rawTitle, slug, bgQuery, direction, tag] = process.argv;
if (!rawTitle || !slug || !bgQuery) {
  console.error(
    'Usage: node scripts/generate-article-cover.mjs "<title>" <slug> "<bg query>" <up|down|flat> ["<tag>"]'
  );
  process.exit(1);
}

const apiKey = process.env.PEXELS_API_KEY;
if (!apiKey) {
  console.error("PEXELS_API_KEY is not set — see web/.env.local.example");
  process.exit(1);
}

// Keep a number and the unit word right after it (and the word right before
// it, e.g. "ใกล้") from being split across lines by gluing them with a
// non-breaking space.
function keepNumbersTogether(text) {
  const nbsp = String.fromCharCode(160);
  return text
    .replace(
      /([ก-๛]+)\s+(\d[\d,]*(?:\.\d+)?)\s+(ดอลลาร์|บาท|ออนซ์|%|เปอร์เซ็นต์)/g,
      (_, w, n, u) => `${w}${nbsp}${n}${nbsp}${u}`
    )
    .replace(/(\d[\d,]*(?:\.\d+)?)\s+(ดอลลาร์|บาท|ออนซ์|%|เปอร์เซ็นต์)/g, (_, n, u) => `${n}${nbsp}${u}`);
}
const title = keepNumbersTogether(rawTitle);
const tagLabel = tag || "ข่าวทองคำ";

const accent = direction === "up" ? "#3ddc84" : direction === "down" ? "#ff6b5e" : "#f0b429";
const accentFill =
  direction === "up" ? "rgba(61,220,132,0.10)" : direction === "down" ? "rgba(255,107,94,0.10)" : "rgba(240,180,41,0.10)";
const chartPoints =
  direction === "down" ? "40,40 140,80 240,60 340,130 440,100 540,170" : "40,150 140,110 240,130 340,60 440,90 540,20";
const chartFill = "40,180 " + chartPoints + " 540,180";

// Avoid reusing the same background photo across articles (shared list with
// fetch-pexels-image.mjs so both generators respect each other's history).
const usedImagesPath = path.join(webRoot, "content", "used-images.json");
const usedIds = fs.existsSync(usedImagesPath) ? JSON.parse(fs.readFileSync(usedImagesPath, "utf-8")) : [];

const searchRes = await fetch(
  `https://api.pexels.com/v1/search?query=${encodeURIComponent(bgQuery)}&per_page=15&orientation=landscape`,
  { headers: { Authorization: apiKey } }
);
if (!searchRes.ok) {
  console.error(`Pexels search failed: ${searchRes.status}`);
  process.exit(1);
}
const searchData = await searchRes.json();
const photos = searchData?.photos ?? [];
if (photos.length === 0) {
  console.error(`No Pexels results for query: ${bgQuery}`);
  process.exit(1);
}
const photo = photos.find((p) => !usedIds.includes(p.id)) ?? photos[0];
usedIds.push(photo.id);
fs.mkdirSync(path.dirname(usedImagesPath), { recursive: true });
fs.writeFileSync(usedImagesPath, JSON.stringify(usedIds.slice(-200), null, 2));

const imgRes = await fetch(photo.src.large);
const bgBuf = Buffer.from(await imgRes.arrayBuffer());
const bgDataUri = `data:image/jpeg;base64,${bgBuf.toString("base64")}`;

const logoBuf = fs.readFileSync(path.join(webRoot, "public", "images", "logo-badge.png"));
const logoDataUri = `data:image/png;base64,${logoBuf.toString("base64")}`;

const h = React.createElement;

const el = h(
  "div",
  {
    style: {
      width: "100%",
      height: "100%",
      display: "flex",
      flexDirection: "column",
      background: "#1c1408",
      padding: "64px 72px",
      position: "relative",
    },
  },
  h("img", {
    src: bgDataUri,
    width: 1200,
    height: 630,
    style: { position: "absolute", top: 0, left: 0, objectFit: "cover" },
  }),
  h("div", {
    style: {
      position: "absolute",
      top: 0,
      left: 0,
      width: 1200,
      height: 630,
      background: "rgba(15,10,4,0.82)",
      display: "flex",
    },
  }),
  h("div", {
    style: {
      position: "absolute",
      top: -160,
      right: -160,
      width: 480,
      height: 480,
      borderRadius: "50%",
      background: "radial-gradient(circle, rgba(240,180,41,0.22) 0%, rgba(240,180,41,0) 70%)",
      display: "flex",
    },
  }),
  h(
    "svg",
    {
      width: 620,
      height: 220,
      viewBox: "0 0 580 200",
      style: { position: "absolute", right: 0, bottom: 0, opacity: 0.9 },
    },
    h("polygon", { points: chartFill, fill: accentFill }),
    h("polyline", {
      points: chartPoints,
      fill: "none",
      stroke: accent,
      strokeWidth: "5",
      strokeLinejoin: "round",
      strokeLinecap: "round",
    })
  ),
  h(
    "div",
    { style: { display: "flex", alignItems: "center", gap: 16 } },
    h(
      "div",
      {
        style: {
          width: 56,
          height: 56,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(240,180,41,0.14)",
          border: "1px solid rgba(240,180,41,0.35)",
        },
      },
      h("img", { src: logoDataUri, width: 42, height: 42 })
    ),
    h(
      "div",
      { style: { fontSize: 22, fontWeight: 700, color: "#c9b183", display: "flex" } },
      "ทองวันนี้ราคา.com"
    )
  ),
  h(
    "div",
    {
      style: {
        display: "flex",
        marginTop: 40,
        padding: "8px 20px",
        borderRadius: 999,
        background: "rgba(240,180,41,0.16)",
        color: "#f0b429",
        fontSize: 20,
        fontWeight: 700,
        alignSelf: "flex-start",
      },
    },
    tagLabel
  ),
  h(
    "div",
    {
      style: {
        display: "flex",
        marginTop: 24,
        fontSize: 54,
        fontWeight: 800,
        color: "#fbf1de",
        lineHeight: 1.6,
        maxWidth: 780,
      },
    },
    title
  )
);

const image = new ImageResponse(el, { width: 1200, height: 630 });
const buffer = Buffer.from(await image.arrayBuffer());

const outDir = path.join(webRoot, "public", "images", "articles");
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, `${slug}.png`);
fs.writeFileSync(outPath, buffer);

console.log(
  JSON.stringify(
    {
      coverImage: `/images/articles/${slug}.png`,
      coverImageCredit: `Background photo by ${photo.photographer} on Pexels`,
      sourcePage: photo.url,
    },
    null,
    2
  )
);
