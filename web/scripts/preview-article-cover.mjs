#!/usr/bin/env node
// Prototype: generates a branded article-cover image (headline + gold-bar
// graphic + trend chart motif) instead of a Pexels stock photo. Not wired
// into the agent pipeline yet — this is just to preview the design.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const React = require("react");
const { ImageResponse } = require("next/og");

// Keep a number and the unit word right after it (and the word right
// before it, e.g. "ใกล้") from being split across lines by gluing them
// with a non-breaking space.
function keepNumbersTogether(text) {
  const nbsp = String.fromCharCode(160);
  return text
    .replace(
      /([ก-๛]+)\s+(\d[\d,]*(?:\.\d+)?)\s+(ดอลลาร์|บาท|ออนซ์|%|เปอร์เซ็นต์)/g,
      (_, w, n, u) => `${w}${nbsp}${n}${nbsp}${u}`
    )
    .replace(/(\d[\d,]*(?:\.\d+)?)\s+(ดอลลาร์|บาท|ออนซ์|%|เปอร์เซ็นต์)/g, (_, n, u) => `${n}${nbsp}${u}`);
}

const webRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const title = keepNumbersTogether(process.argv[2] || "ราคาทองคำวันนี้");
const tag = process.argv[3] || "ข่าวทองคำ";
const outFile = process.argv[4] || "preview-cover.png";
const bgQuery = process.argv[5] || "gold bars businessman finance chart";

const envPath = path.join(webRoot, ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
  }
}

const logoBuf = fs.readFileSync(path.join(webRoot, "public", "images", "logo-badge.png"));
const logoDataUri = `data:image/png;base64,${logoBuf.toString("base64")}`;

let bgDataUri = null;
if (process.env.PEXELS_API_KEY) {
  const searchRes = await fetch(
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(bgQuery)}&per_page=1&orientation=landscape`,
    { headers: { Authorization: process.env.PEXELS_API_KEY } }
  );
  const searchData = await searchRes.json();
  const photo = searchData?.photos?.[0];
  if (photo) {
    const imgRes = await fetch(photo.src.large);
    const buf = Buffer.from(await imgRes.arrayBuffer());
    bgDataUri = `data:image/jpeg;base64,${buf.toString("base64")}`;
    console.log("bg credit:", photo.photographer, photo.url);
  }
}

const h = React.createElement;

// simple upward trend line motif, drawn as SVG points
const chartPoints = "40,150 140,110 240,130 340,60 440,90 540,20";
const chartFill = "40,180 " + chartPoints + " 540,180";

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
  // real photo background, if we got one
  bgDataUri &&
    h("img", {
      src: bgDataUri,
      width: 1200,
      height: 630,
      style: { position: "absolute", top: 0, left: 0, objectFit: "cover" },
    }),
  // uniform dark scrim over the whole photo so text stays legible everywhere
  h("div", {
    style: {
      position: "absolute",
      inset: 0,
      width: "100%",
      height: "100%",
      background: "rgba(15,10,4,0.82)",
      display: "flex",
    },
  }),
  // glow accent
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
  // trend chart motif, bottom-right, large and faint
  h(
    "svg",
    {
      width: 620,
      height: 220,
      viewBox: "0 0 580 200",
      style: { position: "absolute", right: 0, bottom: 0, opacity: 0.9 },
    },
    h("polygon", { points: chartFill, fill: "rgba(61,220,132,0.10)" }),
    h("polyline", {
      points: chartPoints,
      fill: "none",
      stroke: "#3ddc84",
      strokeWidth: "5",
      strokeLinejoin: "round",
      strokeLinecap: "round",
    })
  ),
  // header: logo + site name
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
  // tag pill
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
    tag
  ),
  // headline
  h(
    "div",
    {
      style: {
        display: "flex",
        marginTop: 24,
        fontSize: 54,
        fontWeight: 800,
        color: "#fbf1de",
        lineHeight: 1.35,
        maxWidth: 780,
      },
    },
    title
  )
);

const image = new ImageResponse(el, { width: 1200, height: 630 });
const buffer = Buffer.from(await image.arrayBuffer());
fs.writeFileSync(outFile, buffer);
console.log("saved:", outFile);
