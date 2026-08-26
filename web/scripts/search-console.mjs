#!/usr/bin/env node
// Pulls real Search Console data (top queries, top pages, indexing status)
// using a Google Cloud service account — no `googleapis` dependency, just a
// hand-signed JWT (RS256, node:crypto) exchanged for an access token.
//
// Setup (one-time, done by the site owner):
//   1. Google Cloud Console → enable "Search Console API" on a project.
//   2. Create a service account, download its JSON key.
//   3. Add the service account's email as a user (Restricted is enough) on
//      the property in search.google.com/search-console.
//   4. Set GOOGLE_SERVICE_ACCOUNT_KEY_PATH in web/.env.local to the key's path.
//
// Usage:
//   node scripts/search-console.mjs sites                       — list sites this account can access
//   node scripts/search-console.mjs analytics [days]             — top queries + pages (default 28 days)
//   node scripts/search-console.mjs inspect <url>                 — URL Inspection (indexing status)

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const webRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const envPath = path.join(webRoot, ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
  }
}

const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH;
if (!keyPath || !fs.existsSync(keyPath)) {
  console.error("GOOGLE_SERVICE_ACCOUNT_KEY_PATH is not set or the file doesn't exist — see web/.env.local.example");
  process.exit(1);
}
const key = JSON.parse(fs.readFileSync(keyPath, "utf-8"));

const siteUrl = process.env.SEARCH_CONSOLE_SITE_URL || "https://xn--42cf1cja4dza0cybnb6a3v.com/";

function base64url(input) {
  return Buffer.from(input).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

async function getAccessToken(scope) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: key.client_email,
    scope,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claim))}`;
  const signature = crypto.createSign("RSA-SHA256").update(unsigned).sign(key.private_key);
  const jwt = `${unsigned}.${base64url(signature).replace(/=+$/, "")}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Token exchange failed: ${JSON.stringify(data)}`);
  return data.access_token;
}

const [, , command, ...rest] = process.argv;

if (command === "sites") {
  const token = await getAccessToken("https://www.googleapis.com/auth/webmasters.readonly");
  const res = await fetch("https://www.googleapis.com/webmasters/v3/sites", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
} else if (command === "analytics") {
  const days = Number(rest[0]) || 28;
  const token = await getAccessToken("https://www.googleapis.com/auth/webmasters.readonly");
  const end = new Date();
  end.setDate(end.getDate() - 2); // Search Console data lags ~2 days
  const start = new Date(end);
  start.setDate(start.getDate() - days);
  const fmt = (d) => d.toISOString().slice(0, 10);

  async function query(dimensions) {
    const res = await fetch(
      `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: fmt(start),
          endDate: fmt(end),
          dimensions,
          rowLimit: 25,
        }),
      }
    );
    const data = await res.json();
    if (!res.ok) throw new Error(`Search Analytics query failed: ${JSON.stringify(data)}`);
    return data.rows ?? [];
  }

  const [queries, pages] = await Promise.all([query(["query"]), query(["page"])]);
  console.log(JSON.stringify({ range: { start: fmt(start), end: fmt(end) }, topQueries: queries, topPages: pages }, null, 2));
} else if (command === "inspect") {
  const url = rest[0];
  if (!url) {
    console.error("Usage: node scripts/search-console.mjs inspect <url>");
    process.exit(1);
  }
  const token = await getAccessToken("https://www.googleapis.com/auth/webmasters.readonly");
  const res = await fetch("https://searchconsole.googleapis.com/v1/urlInspection/index:inspect", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ inspectionUrl: url, siteUrl }),
  });
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
} else {
  console.error(
    "Usage:\n  node scripts/search-console.mjs sites\n  node scripts/search-console.mjs analytics [days]\n  node scripts/search-console.mjs inspect <url>"
  );
  process.exit(1);
}
