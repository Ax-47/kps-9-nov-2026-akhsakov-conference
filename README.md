# แนะแนว Programming — เว็บสไลด์ (Next.js)

เว็บนี้เอาสไลด์ทั้ง 66 หน้าจากเดค “แนะแนว Programming: จาก C ถึง Rust และสมองที่เรียนรู้” มาแสดงเป็นเว็บ
ทำด้วย Next.js 14 (App Router) แบบ static export ได้ไฟล์เว็บนิ่ง ๆ เอาไปวางที่ไหนก็ได้

## รัน

```bash
npm install
npm run dev        # เปิด http://localhost:3000
npm run build      # สร้างเว็บนิ่งในโฟลเดอร์ out/
npm start          # เปิดดู out/ ที่ http://localhost:3000
```

ต้องใช้ Node.js 18.17 ขึ้นไป

## ใช้งาน

| ปุ่ม | ทำอะไร |
|---|---|
| `→` `Space` `Enter` `PageDown` / คลิกด้านขวา / ปัดซ้าย | หน้าถัดไป |
| `←` `Backspace` `PageUp` / คลิกด้านซ้าย / ปัดขวา | หน้าก่อน |
| `Home` / `End` | หน้าแรก / หน้าสุดท้าย |
| `N` | เปิด/ปิดโน้ตผู้พูด |
| `O` | ดูสไลด์ทุกหน้า (กดเพื่อกระโดดไปหน้านั้น) |
| `F` | เต็มจอ |

ลิงก์ไปหน้าที่ต้องการได้ด้วย `#slide-N` เช่น `/#slide-10`

## Deploy

- **Vercel:** push ขึ้น GitHub แล้ว Import โปรเจกต์ใน Vercel ได้เลย ไม่ต้องตั้งค่าเพิ่ม
- **GitHub Pages หรือ static host อื่น:** `npm run build` แล้วอัปโหลดโฟลเดอร์ `out/`
  ถ้าเว็บอยู่ใต้ path ย่อย (เช่น `https://user.github.io/guide/`) ให้ build ด้วย `BASE_PATH=/guide npm run build`

## โครงโปรเจกต์

```
content/deck.json          ลำดับสไลด์ ชื่อเดค ฟอนต์ และหัวข้อแต่ละ Part
content/slides/<id>.html   สไลด์ละไฟล์ (รูปแบบเดียวกับเดคต้นฉบับ) + โน้ตผู้พูดใน <aside>
public/assets/             รูปที่ใช้ในสไลด์
lib/deck.ts                อ่านสไลด์ตอน build แล้วแปลงเป็น HTML ธรรมดา
components/Deck.tsx        ตัวเปิดสไลด์: เปลี่ยนหน้า ย่อขยายพอดีจอ โน้ต ดูทุกหน้า เต็มจอ
app/globals.css            สไตล์หน้าเว็บ + ค่าเริ่มต้นของสไลด์
```

`lib/deck.ts` แปลงของพิเศษในไฟล์สไลด์ตอน build:
`<x-connector>` เป็นเส้นลูกศร SVG, `<x-shape>` เป็นรูปทรงด้วย `clip-path`, `<x-icon>` เป็นไอคอนจาก
[Lucide](https://lucide.dev) และ `/_blob/<id>` เป็นรูปใน `public/assets/`

## แก้เนื้อหา

แก้ไฟล์ใน `content/slides/` หรือสลับลำดับใน `content/deck.json` แล้ว `npm run dev` ใหม่
สไลด์เป็นผืน 1920×1080 px ตำแหน่งทุกอย่างเขียนเป็น inline style แบบเดียวกับเดคต้นฉบับ
