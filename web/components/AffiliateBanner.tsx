import { C } from "@/lib/theme";

const BANNERS = [
  {
    src: "/images/affiliate/aurora-gold-bar-96.5.webp",
    href: "https://s.shopee.co.th/9fKN0LDvMZ",
    alt: "Aurora Gold ทองคำแท้ 96.5% การันตีรับซื้อคืนราคาสูงสุด",
  },
  {
    src: "/images/affiliate/aurora-gold-1baht.webp",
    href: "https://s.shopee.co.th/4AzQSGpAjK",
    alt: "Aurora Gold ทองคำแท่ง 1 บาท 96.5% การันตีรับซื้อคืนราคาสูงสุด",
  },
  {
    src: "/images/affiliate/gold-ring-half-salung.webp",
    href: "https://s.shopee.co.th/3LQJadODad?share_channel_code=6",
    alt: "แหวนทอง 1/2 สลึง ผ่อน SPayLater ได้ ทองแท้ 96.5%",
  },
  {
    src: "/images/affiliate/gold-necklace-2salung.webp",
    href: "https://s.shopee.co.th/BTHorLrY4?share_channel_code=6",
    alt: "สร้อยคอทอง น้ำหนัก 2 สลึง ผ่อน SPayLater ได้ รับซื้อคืนทุกชิ้น",
  },
  {
    src: "/images/affiliate/gold-necklace-nopakao.webp",
    href: "https://s.shopee.co.th/9V0ww4OEfh?share_channel_code=6",
    alt: "ร้านทองนพเก้า สร้อยคอ 2 สลึง เลือกลายฟรีทั้งร้าน",
  },
];

// Affiliate ad slot: two banners shown side by side, small. `startIndex`
// picks which pair from the pool (wraps around), so multiple slots on the
// same page rotate through different products instead of repeating.
export default function AffiliateBanner({ startIndex = 0, className = "" }: { startIndex?: number; className?: string }) {
  const pair = [BANNERS[startIndex % BANNERS.length], BANNERS[(startIndex + 1) % BANNERS.length]];
  return (
    <div className={`grid grid-cols-2 gap-2 max-w-xs mx-auto ${className}`}>
      {pair.map((banner) => (
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
