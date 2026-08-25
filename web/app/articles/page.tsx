import Link from "next/link";
import type { Metadata } from "next";
import { getAllArticles } from "@/lib/articles";
import { C } from "@/lib/theme";

export const metadata: Metadata = {
  title: "บทความข่าวทองคำ | ราคาทองวันนี้",
  description: "บทวิเคราะห์และข่าวสถานการณ์ทองคำโลก อัปเดตสำหรับนักลงทุนทองคำชาวไทย",
};

export default function ArticlesPage() {
  const articles = getAllArticles();

  return (
    <div className="min-h-screen w-full" style={{ background: C.paper }}>
      <header className="max-w-2xl mx-auto px-6 pt-10 pb-5" style={{ borderBottom: `2px solid ${C.ink}` }}>
        <div
          className="font-body text-[13px] font-semibold uppercase tracking-[0.16em] mb-2"
          style={{ color: C.inkSoft }}
        >
          ทองคำออนไลน์ · บทความ
        </div>
        <h1 className="font-display text-4xl font-medium tracking-tight" style={{ color: C.ink }}>
          ข่าวและบทความทองคำ
        </h1>
        <Link href="/" className="font-body text-sm underline mt-3 inline-block" style={{ color: C.gold }}>
          กลับไปหน้าเช็คราคาทอง
        </Link>
      </header>

      <main className="max-w-2xl mx-auto px-6 pb-20 pt-8">
        {articles.length === 0 ? (
          <p className="font-body text-base py-10 text-center" style={{ color: C.inkFaint }}>
            ยังไม่มีบทความ
          </p>
        ) : (
          <div>
            {articles.map((a) => (
              <Link
                key={a.slug}
                href={`/articles/${a.slug}`}
                className="block py-6"
                style={{ borderTop: `1px solid ${C.line}` }}
              >
                <div className="font-body text-[13px]" style={{ color: C.inkFaint }}>
                  {a.date}
                  {a.tags.length > 0 && " · " + a.tags.join(", ")}
                </div>
                <h2 className="font-display text-xl font-medium mt-1" style={{ color: C.ink }}>
                  {a.title}
                </h2>
                <p className="font-body text-base mt-2 leading-relaxed" style={{ color: C.inkSoft }}>
                  {a.excerpt}
                </p>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
