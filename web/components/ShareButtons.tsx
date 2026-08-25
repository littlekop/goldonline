import { C } from "@/lib/theme";

// Plain <a> links (no JS needed) that open each platform's own share
// dialog — no API keys or app setup required for either.
export default function ShareButtons({ url, title }: { url: string; title: string }) {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const lineUrl = `https://social-plugins.line.me/lineit/share?url=${encodedUrl}&text=${encodedTitle}`;
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;

  const pillStyle = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 16px",
    borderRadius: 999,
    fontSize: 13,
    fontWeight: 600,
    color: C.ink,
    border: `1px solid ${C.line}`,
    background: C.cardSoft,
  } as const;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="font-body text-[13px]" style={{ color: C.inkFaint }}>
        แชร์:
      </span>
      <a href={lineUrl} target="_blank" rel="noopener noreferrer" className="font-body" style={pillStyle}>
        LINE
      </a>
      <a href={facebookUrl} target="_blank" rel="noopener noreferrer" className="font-body" style={pillStyle}>
        Facebook
      </a>
    </div>
  );
}
