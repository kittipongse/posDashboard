# PosDashboard

พอร์ทัลสำหรับ **ตัวแทนร้านค้า (Vendor)** — login แยกจาก POS แล้วดูรายงานยอดขายเฉพาะสินค้าของตัวเอง  
ใช้ MySQL ชุดเดียวกับ [posApp](../posApp) · ไม่มีหน้าขาย / แก้ master

Blueprint: [newproject.md](./newproject.md)

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
