import { C } from "@/lib/theme";

const BANNERS = [
  {
    src: "/images/affiliate/aurora-gold-bar-96.5.png",
    href: "https://s.shopee.co.th/9fKN0LDvMZ",
    alt: "Aurora Gold ทองคำแท้ 96.5% การันตีรับซื้อคืนราคาสูงสุด",
  },
  {
    src: "/images/affiliate/aurora-gold-1baht.png",
    href: "https://s.shopee.co.th/4AzQSGpAjK",
    alt: "Aurora Gold ทองคำแท่ง 1 บาท 96.5% การันตีรับซื้อคืนราคาสูงสุด",
  },
];

// Affiliate banner shown in place of an ad slot. `variant` picks which of
// the two Aurora Gold creatives to show, so the same two banners can be
// spread across multiple slots on a page without repeating back-to-back.
export default function AffiliateBanner({
  variant = 0,
  className = "",
}: {
  variant?: 0 | 1;
  className?: string;
}) {
  const banner = BANNERS[variant % BANNERS.length];
  return (
    <a
      href={banner.href}
      target="_blank"
      rel="sponsored noopener noreferrer"
      className={`block relative rounded-2xl overflow-hidden max-w-xs mx-auto ${className}`}
      style={{ border: `1px solid ${C.line}` }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={banner.src} alt={banner.alt} className="w-full h-auto block" />
      <span
        className="absolute top-2 right-2 font-body text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide"
        style={{ background: "rgba(0,0,0,0.45)", color: "#fff" }}
      >
        โฆษณา
      </span>
    </a>
  );
}
