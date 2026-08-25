#!/usr/bin/env node
// Fetches gold-market news from public RSS feeds and prints recent items as
// JSON, for the gold-news-writer agent to read before researching/writing an
// article. No API key needed — these are public RSS feeds.
//
// Usage: node scripts/fetch-gold-news-rss.mjs [maxAgeHours]
//   maxAgeHours (default 48) — drop items older than this

const FEEDS = [
  { name: "Google News (gold price)", url: "https://news.google.com/rss/search?q=gold%20price&hl=en-US&gl=US&ceid=US:en" },
  { name: "Google News (ราคาทอง)", url: "https://news.google.com/rss/search?q=%E0%B8%A3%E0%B8%B2%E0%B8%84%E0%B8%B2%E0%B8%97%E0%B8%AD%E0%B8%87&hl=th&gl=TH&ceid=TH:th" },
  { name: "Google News (gold market analysis)", url: "https://news.google.com/rss/search?q=gold%20market%20analysis&hl=en-US&gl=US&ceid=US:en" },
];

const maxAgeHours = Number(process.argv[2]) || 48;
const cutoff = Date.now() - maxAgeHours * 60 * 60 * 1000;

function decodeEntities(s) {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, "$1")
    .trim();
}

function extractTag(block, tag) {
  const m = block.match(new RegExp(`<${tag}[^>]*>(.*?)</${tag}>`, "s"));
  return m ? decodeEntities(m[1]) : "";
}

function parseRss(xml, feedName) {
  const items = [...xml.matchAll(/<item>(.*?)<\/item>/gs)].map((m) => m[1]);
  return items.map((block) => {
    const title = extractTag(block, "title");
    const link = extractTag(block, "link");
    const pubDate = extractTag(block, "pubDate");
    const source = extractTag(block, "source") || feedName;
    return { title, link, source, pubDate, feed: feedName };
  });
}

const results = [];
for (const feed of FEEDS) {
  try {
    const res = await fetch(feed.url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; gold-tracker-news/1.0)" },
    });
    if (!res.ok) {
      console.error(`[skip] ${feed.name}: HTTP ${res.status}`);
      continue;
    }
    const xml = await res.text();
    const items = parseRss(xml, feed.name);
    results.push(...items);
  } catch (err) {
    console.error(`[skip] ${feed.name}: ${err.message}`);
  }
}

const filtered = results
  .map((item) => ({ ...item, timestamp: item.pubDate ? Date.parse(item.pubDate) : NaN }))
  .filter((item) => item.title && (Number.isNaN(item.timestamp) || item.timestamp >= cutoff))
  .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

// dedupe by title
const seen = new Set();
const deduped = filtered.filter((item) => {
  const key = item.title.toLowerCase().trim();
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
});

console.log(JSON.stringify(deduped, null, 2));
