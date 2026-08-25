// Central place for the site's canonical URL — used by sitemap.ts, robots.ts,
// and metadataBase. Set NEXT_PUBLIC_SITE_URL once the real domain is live;
// falls back to the intended domain name so links resolve sensibly even
// before that env var is configured.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://your-domain.com").replace(/\/$/, "");

// Google AdSense publisher ID (ca-pub-XXXXXXXXXXXXXXXX), used for the
// site-verification/auto-ads script in app/layout.tsx and for any manual
// <ins class="adsbygoogle"> ad units placed in individual pages.
export const ADSENSE_CLIENT_ID = "ca-pub-8127478011085658";
