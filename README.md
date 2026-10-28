# PosDashboard

พอร์ทัลสำหรับ **ตัวแทนร้านค้า (Vendor)** — login แยกจาก POS แล้วดูรายงานยอดขายเฉพาะสินค้าของตัวเอง  
ใช้ MySQL ชุดเดียวกับ [posApp](../posApp) · ไม่มีหน้าขาย / แก้ master

Blueprint: [newproject.md](./newproject.md)

## Production (Vercel)

| | URL |
|---|---|
| Web (โดเมนหลัก) | https://vendor.delight-herbal-house.com |
| API (โดเมนหลัก) | https://vendor-api.delight-herbal-house.com |
| Fallback | https://pos-dashboard-web-eosin.vercel.app · https://pos-dashboard-api.vercel.app |

โปรเจกต์ Vercel: `pos-dashboard-web` / `pos-dashboard-api` (ทีม zybercools-projects)  
Root Directory: `frontend` / `backend`

### DNS ที่ต้องตั้ง (delight-herbal-house.com)

ตอนนี้ยังชี้ A ไปที่ `206.189.90.152` — ให้เปลี่ยนเป็น CNAME ตามนี้:

| Type | Name | Value |
|---|---|---|
| CNAME | `vendor` | `23433df567f780e1.vercel-dns-017.com.` |
| CNAME | `vendor-api` | `1db111b8fe527181.vercel-dns-017.com.` |

(ลบ A record เก่าของ `vendor` / `vendor-api` ถ้ามี แล้วค่อยใส่ CNAME)

## โครงสร้าง

```
PosDashboard/
├── frontend/   # Vue 3 + Vite (พอร์ต 5174)
└── backend/    # Express API (พอร์ต 3010)
```

## ตั้งค่าบัญชี Vendor (ทำใน posApp)

1. รัน migration portal บน Cloud DB ของ posApp (ถ้ายังไม่รัน)
2. เปิดหน้า **ผู้จำหน่าย** บน posApp Cloud
3. ตั้ง Username / รหัสผ่านพอร์ทัล และเปิด PosDashboard

## รันบนเครื่องพัฒนา

```bash
# 1) คัดลอก env
copy backend\env.local backend\.env.local
copy frontend\env.local frontend\.env.local

# 2) ใส่ค่า DB_REMOTE_* ชุดเดียวกับ posApp Cloud
#    และตั้ง JWT_SECRET คนละค่ากับ posApp

# 3) ติดตั้ง + ensure คอลัมน์ portal (ครั้งแรก) + รัน
npm install
npm install --prefix backend
npm install --prefix frontend
npm run db:ensure-portal --prefix backend
npm run dev:api
npm run dev:web
```

หรือใช้ `node scripts/bootstrap-env.mjs` เพื่อคัดลอก `DB_REMOTE_*` จาก posApp และสร้าง JWT_SECRET คนละค่า

- Web: http://localhost:5174  
- API: http://localhost:3010/api/v1/health  

## ความปลอดภัย

- JWT `issuer` / `aud` = `pos-dashboard` · คนละ `JWT_SECRET` กับ posApp  
- รายงานทุกเส้นใช้ `vendorId` จาก token เท่านั้น — ไม่รับจาก query/body  
- V1 แสดงเฉพาะยอดขาย / จำนวนชิ้น / จำนวนบิล (ไม่โชว์ต้นทุน-กำไร)
