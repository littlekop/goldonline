import GoldTracker from "@/components/GoldTracker";
import { getAllArticles } from "@/lib/articles";

const faq = [
  {
    q: "ทองคำแท่ง กับ ทองรูปพรรณ ต่างกันอย่างไร",
    a: "ทองคำแท่งซื้อ-ขายคืนที่ราคาตลาดล้วนๆ ไม่มีค่ากำเหน็จ เหมาะกับการเก็บเป็นสินทรัพย์ ส่วนทองรูปพรรณมีค่าแรงขึ้นรูป (ค่ากำเหน็จ) บวกเพิ่มตอนซื้อ และมักหักค่ากำเหน็จคืนบางส่วนตอนขายคืน ทำให้ต้นทุนที่แท้จริงสูงกว่าราคาทองในกระดานเสมอ",
  },
  {
    q: "ขายทองวันนี้ ได้เงินสุทธิเท่าไหร่",
    a: "เงินที่ได้จริง = น้ำหนักทอง × ราคารับซื้อ ณ วันนั้น ลบด้วยค่ากำเหน็จที่ร้านอาจหักเพิ่มสำหรับทองรูปพรรณ (ทองแท่งปกติไม่หัก) เครื่องคำนวณด้านบนนี้รวมค่ากำเหน็จที่กรอกไว้ในต้นทุนให้แล้ว ตัวเลขกำไร/ขาดทุนจึงใกล้เคียงความจริงมากกว่าคิดจากราคาทองอย่างเดียว",
  },
  {
    q: "1 บาททอง เท่ากับกี่กรัม กี่สลึง",
    a: "1 บาททอง = 4 สลึง = 15.244 กรัม ตามมาตรฐานหน่วยชั่งทองคำของไทย",
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faq.map((item) => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: { "@type": "Answer", text: item.a },
  })),
};

export default function Home() {
  const latestArticles = getAllArticles().slice(0, 5);
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <GoldTracker latestArticles={latestArticles} />
    </>
  );
}
