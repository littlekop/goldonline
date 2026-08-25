#!/usr/bin/env node
// Posts a daily open/high/low/close summary (bar-gold sell price, THB) to
// the Facebook Page, built from the snapshots log-gold-price.mjs collected
// throughout the day. Run this once, near the end of the trading day.
// Skips quietly if Facebook isn't configured or there's no log for today.
//
// Usage: node scripts/post-daily-summary.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

const pageId = process.env.FACEBOOK_PAGE_ID;
const pageToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
if (!pageId || !pageToken) {
  console.log(JSON.stringify({ skipped: true, reason: "FACEBOOK_PAGE_ID / FACEBOOK_PAGE_ACCESS_TOKEN not set" }));
  process.exit(0);
}

function bangkokDateStr(date) {
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" });
  return fmt.format(date);
}

const dateStr = bangkokDateStr(new Date());
const logPath = path.join(webRoot, "content", "price-log", `${dateStr}.json`);

if (!fs.existsSync(logPath)) {
  console.log(JSON.stringify({ skipped: true, reason: `No price log for ${dateStr}` }));
  process.exit(0);
}

const entries = JSON.parse(fs.readFileSync(logPath, "utf-8"));
if (entries.length === 0) {
  console.log(JSON.stringify({ skipped: true, reason: "Price log is empty" }));
  process.exit(0);
}

const sells = entries.map((e) => e.barSell);
const open = entries[0].barSell;
const close = entries[entries.length - 1].barSell;
const high = Math.max(...sells);
const low = Math.min(...sells);
const change = close - open;
const changeThai = change > 0 ? `เพิ่มขึ้น ${change.toLocaleString("th-TH")} บาท 📈` : change < 0 ? `ลดลง ${Math.abs(change).toLocaleString("th-TH")} บาท 📉` : "ไม่เปลี่ยนแปลง ➡️";

const thaiDate = new Date().toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "long", year: "numeric" });

const fmtBaht = (n) => n.toLocaleString("th-TH");

const message = [
  `📊 สรุปราคาทองคำวันนี้ (ทองคำแท่ง 96.5%) — ${thaiDate}`,
  "",
  `เปิดตลาด: ${fmtBaht(open)} บาท`,
  `สูงสุด: ${fmtBaht(high)} บาท`,
  `ต่ำสุด: ${fmtBaht(low)} บาท`,
  `ล่าสุด/ปิดตลาด: ${fmtBaht(close)} บาท`,
  "",
  `วันนี้ราคาทอง${changeThai}`,
  "",
  `เช็คราคาทองคำเรียลไทม์ + คำนวณกำไรขาดทุน: ${process.env.NEXT_PUBLIC_SITE_URL || "https://xn--42cf1cja4dza0cybnb6a3v.com"}`,
  "",
  "#ทอง #ทองคำ #ราคาทอง #ราคาทองคำ #ราคาทองวันนี้ #ลงทุนทอง #ออมทอง #ทองคำแท่ง",
].join("\n");

const res = await fetch(`https://graph.facebook.com/v19.0/${pageId}/feed`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ message, access_token: pageToken }),
});
const data = await res.json();

if (!res.ok) {
  console.error(`Facebook post failed: ${res.status} ${JSON.stringify(data)}`);
  process.exit(1);
}

console.log(JSON.stringify({ posted: true, facebookPostId: data.post_id || data.id, open, high, low, close }, null, 2));
