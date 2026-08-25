// Central place for the site's canonical URL — used by sitemap.ts, robots.ts,
// and metadataBase. Set NEXT_PUBLIC_SITE_URL once the real domain is live;
// falls back to the intended domain name so links resolve sensibly even
// before that env var is configured.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://your-domain.com").replace(/\/$/, "");
