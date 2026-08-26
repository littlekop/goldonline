import type { Metadata } from "next";
import Link from "next/link";
import { C } from "@/lib/theme";
import { SITE_URL } from "@/lib/site";
import Breadcrumb from "@/components/Breadcrumb";
import WidgetCodeBlock from "@/components/WidgetCodeBlock";

export const metadata: Metadata = {
  title: "ฝังราคาทองในเว็บคุณ (ฟรี)",
  description: "โค้ด widget ราคาทองคำวันนี้ ฝังในเว็บไซต์หรือบล็อกของคุณได้ฟรี อัปเดตราคาอัตโนมัติจากสมาคมค้าทองคำแห่งประเทศไทย",
  alternates: { canonical: "/widget" },
};

const embedCode = `<!-- ทองวันนี้ราคา.com — ราคาทองคำวันนี้ -->
<iframe src="${SITE_URL}/embed/gold-price" width="320" height="230" style="border:0;max-width:100%" loading="lazy" title="ราคาทองคำวันนี้"></iframe>
<div style="font:12px sans-serif;text-align:center;margin-top:4px">
  ข้อมูลจาก <a href="${SITE_URL}" target="_blank" rel="noopener">ทองวันนี้ราคา.com</a>
</div>`;

export default function WidgetPage() {
  return (
    <div className="min-h-screen w-full" style={{ background: C.paper }}>
      <header className="max-w-2xl mx-auto px-6 pt-10 pb-5" style={{ borderBottom: `2px solid ${C.ink}` }}>
        <Breadcrumb items={[{ name: "หน้าแรก", href: "/" }, { name: "ฝังราคาทองในเว็บคุณ" }]} />
        <h1 className="font-display text-3xl font-medium tracking-tight" style={{ color: C.ink }}>
          ฝังราคาทองคำในเว็บคุณ — ฟรี
        </h1>
        <p className="font-body text-base mt-3 leading-relaxed" style={{ color: C.inkSoft }}>
          มีเว็บไซต์ บล็อก หรือหน้า Facebook ของร้านทอง? ฝัง widget ราคาทองคำนี้ไว้ในเว็บของคุณได้ฟรี
          อัปเดตราคาอัตโนมัติจากสมาคมค้าทองคำแห่งประเทศไทย ไม่ต้องอัปเดตเอง
        </p>
      </header>

      <main className="max-w-2xl mx-auto px-6 pb-20 pt-8">
        <section className="p-5 mb-6" style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 20 }}>
          <div className="font-body text-[13px] font-semibold uppercase tracking-[0.14em] mb-4" style={{ color: C.inkSoft }}>
            ตัวอย่าง
          </div>
          <iframe
            src="/embed/gold-price"
            width="320"
            height="230"
            style={{ border: 0, maxWidth: "100%" }}
            loading="lazy"
            title="ราคาทองคำวันนี้"
          />
        </section>

        <section className="p-5 mb-6" style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 20 }}>
          <div className="font-body text-[13px] font-semibold uppercase tracking-[0.14em] mb-4" style={{ color: C.inkSoft }}>
            วิธีใช้
          </div>
          <ol className="font-body text-base space-y-2 leading-relaxed" style={{ color: C.ink }}>
            <li>1. คัดลอกโค้ดด้านล่าง</li>
            <li>2. วางในหน้าเว็บ บล็อก หรือ HTML widget ของคุณ (WordPress, Blogger, เว็บไซต์ทั่วไป)</li>
            <li>3. เสร็จแล้ว — ราคาจะอัปเดตอัตโนมัติทุก 5 นาที ไม่ต้องแก้โค้ดเอง</li>
          </ol>
        </section>

        <section className="p-5" style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 20 }}>
          <div className="font-body text-[13px] font-semibold uppercase tracking-[0.14em] mb-4" style={{ color: C.inkSoft }}>
            โค้ดสำหรับฝัง
          </div>
          <WidgetCodeBlock code={embedCode} />
          <p className="font-body text-[13px] mt-4" style={{ color: C.inkFaint }}>
            ใช้งานฟรี ไม่มีค่าใช้จ่าย ขอเพียงคงลิงก์เครดิตด้านล่าง widget ไว้
          </p>
        </section>

        <div className="mt-8 text-center">
          <Link href="/" className="font-body text-sm underline" style={{ color: C.gold }}>
            ← กลับไปหน้าเช็คราคาทอง
          </Link>
        </div>
      </main>
    </div>
  );
}
