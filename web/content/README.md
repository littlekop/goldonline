# โครงสร้างบทความ

- `drafts/` — บทความที่ agent เขียนแล้ว แต่ self-check ไม่ผ่านครบ 8 ข้อ เลยรอคนตรวจ ยัง**ไม่ขึ้นเว็บ**
- `published/` — บทความที่ขึ้นเว็บจริงที่ `/articles` (ส่วนใหญ่ agent จะ publish เองอัตโนมัติถ้า self-check ผ่านครบ)
- `publish-log.md` — บันทึกทุกครั้งที่ agent รัน (ไม่ว่าจะ publish, เก็บไว้เป็น draft, หรือไม่มีข่าวให้เขียน) ใช้ตรวจย้อนหลังว่าอะไรขึ้นเว็บไปเองบ้าง

Agent (`gold-news-writer`, ดู `.claude/agents/gold-news-writer.md`) จะเช็คคุณภาพบทความตัวเอง 8 ข้อก่อนทุกครั้ง (แหล่งข่าวจริง, ไม่มีคำแนะนำลงทุนตรงๆ, มี disclaimer, ฯลฯ) — **ถ้าผ่านครบจะ publish ให้เองทันที ไม่ต้องรอคนอนุมัติ** ถ้าไม่ผ่านข้อไหนจะเก็บไว้ใน `drafts/` พร้อมบอกว่าติดข้อไหน

## วิธี publish บทความที่ค้างอยู่ใน drafts/ (กรณี self-check ไม่ผ่าน)

1. เปิดไฟล์ใน `drafts/<slug>.md` อ่านตรวจเนื้อหา แหล่งข่าว (`sources`) และรูปภาพให้ถูกต้อง — เช็คจุดที่ log บอกว่าติดปัญหาโดยเฉพาะ
2. รันคำสั่ง:

   ```bash
   node scripts/publish-draft.mjs <slug>
   ```

   คำสั่งนี้จะย้ายไฟล์จาก `drafts/` ไป `published/` ให้ (ไม่มีการแก้เนื้อหาใดๆ)
3. deploy/รัน dev server ใหม่ บทความจะขึ้นที่ `/articles/<slug>`

## Frontmatter schema

```yaml
---
title: "หัวข้อบทความ"
excerpt: "สรุปสั้น 1-2 ประโยคสำหรับหน้ารายการบทความและ meta description"
date: "2026-08-25" # YYYY-MM-DD วันที่เขียน
coverImage: "/images/articles/<slug>.jpg" # path relative to /public
coverImageCredit: "Photo by X on Pexels" # ต้องมี attribution ตามเงื่อนไข license
sources:
  - title: "ชื่อแหล่งข่าวต้นทาง"
    url: "https://..."
tags: ["ข่าวทองคำ", "ราคาทองโลก"]
---

เนื้อหาบทความเป็น Markdown ปกติ...
```

**กฎสำคัญ:** บทความทุกชิ้นต้องมีบรรทัดปฏิเสธความรับผิดชอบท้ายบทความว่า
"เนื้อหานี้เป็นข้อมูลเพื่อการศึกษา ไม่ใช่คำแนะนำการลงทุน" — agent จะใส่ให้อัตโนมัติ
ห้ามลบทิ้งตอนตรวจ
