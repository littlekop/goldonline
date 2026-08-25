#!/usr/bin/env node
// Appends a gold-price snapshot to content/price-log/<YYYY-MM-DD>.json
// (Asia/Bangkok date). Run this periodically (e.g. hourly) via a scheduled
// task so post-daily-summary.mjs has enough readings to compute a real
// open/high/low/close for the day. Fetches the same GTA feed the site's
// own /api/live-prices route uses, so numbers always match what's on the
// site — no dependency on the Next.js server being up.
//
// Usage: node scripts/log-gold-price.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

function bangkokDateParts(date) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value]));
  return { dateStr: `${parts.year}-${parts.month}-${parts.day}`, timeStr: `${parts.hour}:${parts.minute}` };
}

async function fetchGta() {
  const res = await fetch("https://www.goldtraders.or.th/api/GoldPrices/Latest?readjson=false", {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "application/json, text/plain, */*",
      Referer: "https://www.goldtraders.or.th/",
    },
  });
  if (!res.ok) throw new Error(`GTA feed failed: ${res.status}`);
  const data = await res.json();
  const barBuy = Number(data.bL_BuyPrice);
  const barSell = Number(data.bL_SellPrice);
  if (![barBuy, barSell].every((n) => Number.isFinite(n) && n > 0)) {
    throw new Error("GTA feed returned incomplete data");
  }
  return { barBuy, barSell, asOf: data.asTime ?? null };
}

const { dateStr, timeStr } = bangkokDateParts(new Date());
const logDir = path.join(webRoot, "content", "price-log");
const logPath = path.join(logDir, `${dateStr}.json`);

let snapshot;
try {
  snapshot = await fetchGta();
} catch (err) {
  console.error(`Skipped: ${err.message}`);
  process.exit(0); // not a hard failure — just no reading this run
}

fs.mkdirSync(logDir, { recursive: true });
const entries = fs.existsSync(logPath) ? JSON.parse(fs.readFileSync(logPath, "utf-8")) : [];
entries.push({ time: timeStr, barBuy: snapshot.barBuy, barSell: snapshot.barSell, asOf: snapshot.asOf });
fs.writeFileSync(logPath, JSON.stringify(entries, null, 2));

console.log(JSON.stringify({ logged: true, date: dateStr, time: timeStr, ...snapshot }));
