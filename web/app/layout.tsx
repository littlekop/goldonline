import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { SITE_URL, ADSENSE_CLIENT_ID, GA_MEASUREMENT_ID } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "ราคาทองคำ วันนี้ | เช็ค ราคาทอง ออนไลน์ เรียลไทม์ คำนวณ กำไร ขาดทุน",
    template: "%s | ราคาทองคำวันนี้",
  },
  description:
    "เช็คราคาทองคำแท่งและทองรูปพรรณวันนี้ อ้างอิงจากสมาคมค้าทองคำแห่งประเทศไทย คำนวณต้นทุน กำไรขาดทุนจากการซื้อทอง พร้อมแชร์ผลลัพธ์เป็นภาพ",
  alternates: { canonical: "/" },
  verification: {
    google: "8pC34lHX2GwccaOKK7-vAWZWR9ObOHPOqvJhC2MDaQU",
    other: { "msvalidate.01": "15D9B0AEEF72E7E47A85FA32BFF4A829" },
  },
  openGraph: {
    type: "website",
    locale: "th_TH",
    siteName: "ราคาทองคำวันนี้",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="th" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Serif+Thai:wght@400;500;600&family=IBM+Plex+Sans+Thai:wght@400;500;600&family=Space+Mono:wght@400;700&display=swap"
          rel="stylesheet"
        />
        {/* set data-theme before first paint to avoid a light/dark flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('gold-theme')||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.dataset.theme=t;}catch(e){}})();`,
          }}
        />
        <Script
          async
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`}
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
        {GA_MEASUREMENT_ID && (
          <>
            <Script
              async
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga4-init" strategy="afterInteractive">
              {`window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_MEASUREMENT_ID}');`}
            </Script>
          </>
        )}
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
