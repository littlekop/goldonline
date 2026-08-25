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

// Affiliate ad slot: both Aurora Gold banners shown side by side, small.
export default function AffiliateBanner({ className = "" }: { className?: string }) {
  return (
    <div className={`grid grid-cols-2 gap-2 max-w-xs mx-auto ${className}`}>
      {BANNERS.map((banner) => (
        <a
          key={banner.href}
          href={banner.href}
          target="_blank"
          rel="sponsored noopener noreferrer"
          className="block relative rounded-xl overflow-hidden"
          style={{ border: `1px solid ${C.line}` }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={banner.src} alt={banner.alt} className="w-full h-auto block" />
          <span
            className="absolute top-1 right-1 font-body text-[9px] font-semibold px-1.5 py-0.5 rounded-full uppercase tracking-wide"
            style={{ background: "rgba(0,0,0,0.45)", color: "#fff" }}
          >
            โฆษณา
          </span>
        </a>
      ))}
    </div>
  );
}
