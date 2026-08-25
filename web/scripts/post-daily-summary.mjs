#!/usr/bin/env node
// Posts a daily open/high/low/close summary (bar-gold sell price, THB) to
// the Facebook Page. Pulls the day's numbers directly from the Gold Traders
// Association of Thailand's own official hourly OHLC feed — the same
// authoritative source used for the site's live price board — rather than
// relying on locally-collected snapshots, so it's accurate on day one and
// isn't affected by this machine being off for part of the day.
// Skips quietly if Facebook isn't configured or today has no data yet.
//
// Usage: node scripts/post-daily-summary.mjs

function bangkokDateStr(date) {
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" });
  return fmt.format(date);
}

const pageId = process.env.FACEBOOK_PAGE_ID;
const pageToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
if (!pageId || !pageToken) {
  console.log(JSON.stringify({ skipped: true, reason: "FACEBOOK_PAGE_ID / FACEBOOK_PAGE_ACCESS_TOKEN not set" }));
  process.exit(0);
}

const dateStr = bangkokDateStr(new Date());

const res = await fetch("https://www.goldtraders.or.th/api/GoldPrices/ohlc?readjson=false", {
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept: "application/json, text/plain, */*",
    Referer: "https://www.goldtraders.or.th/",
  },
});
if (!res.ok) {
  console.log(JSON.stringify({ skipped: true, reason: `GTA ohlc feed failed: ${res.status}` }));
  process.exit(0);
}
const all = await res.json();
const today = all.filter((d) => d.hour.startsWith(dateStr));

if (today.length === 0) {
  console.log(JSON.stringify({ skipped: true, reason: `No OHLC entries yet for ${dateStr}` }));
  process.exit(0);
}

const open = today[0].open;
const close = today[today.length - 1].close;
const high = Math.max(...today.map((d) => d.high));
const low = Math.min(...today.map((d) => d.low));
const change = close - open;
const changeThai = change > 0 ? `เพิ่มขึ้น ${change.toLocaleString("th-TH")} บาท 📈` : change < 0 ? `ลดลง ${Math.abs(change).toLocaleString("th-TH")} บาท 📉` : "ไม่เปลี่ยนแปลง ➡️";

const thaiDate = new Date().toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "long", year: "numeric" });

const fmtBaht = (n) => n.toLocaleString("th-TH");
const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://xn--42cf1cja4dza0cybnb6a3v.com").replace(/\/$/, "");

const message = [
  `📊 สรุปราคาทองคำวันนี้ (ทองคำแท่ง 96.5%) — ${thaiDate}`,
  "",
  `เปิดตลาด: ${fmtBaht(open)} บาท`,
  `สูงสุด: ${fmtBaht(high)} บาท`,
  `ต่ำสุด: ${fmtBaht(low)} บาท`,
  `ปิดตลาด: ${fmtBaht(close)} บาท`,
  "",
  `วันนี้ราคาทอง${changeThai}`,
  "",
  `เช็คราคาทองคำ ได้ทุกวันที่นี่ : ${siteUrl}`,
  "",
  "#ทอง #ทองคำ #ราคาทอง #ราคาทองคำ #ราคาทองวันนี้ #ลงทุนทอง #ออมทอง #ทองคำแท่ง",
].join("\n");

const imageUrl = `${siteUrl}/api/daily-summary-image?${new URLSearchParams({
  open: String(open),
  high: String(high),
  low: String(low),
  close: String(close),
  date: thaiDate,
  changeLabel: `วันนี้ราคาทอง${changeThai.replace(/[📈📉➡️]/g, "").trim()}`,
  changeUp: change >= 0 ? "1" : "0",
}).toString()}`;

const postRes = await fetch(`https://graph.facebook.com/v19.0/${pageId}/photos`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ url: imageUrl, caption: message, access_token: pageToken }),
});
const data = await postRes.json();

if (!postRes.ok) {
  console.error(`Facebook post failed: ${postRes.status} ${JSON.stringify(data)}`);
  process.exit(1);
}

console.log(JSON.stringify({ posted: true, facebookPostId: data.post_id || data.id, open, high, low, close }, null, 2));
