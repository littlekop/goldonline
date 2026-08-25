# โครงสร้างบทความ

- `drafts/` — บทความที่ agent เขียนแล้ว รอคนตรวจ ยัง**ไม่ขึ้นเว็บ**
- `published/` — บทความที่ตรวจแล้วและขึ้นเว็บจริงที่ `/articles`

## วิธี publish บทความ

1. เปิดไฟล์ใน `drafts/<slug>.md` อ่านตรวจเนื้อหา แหล่งข่าว (`sources`) และรูปภาพให้ถูกต้อง
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
