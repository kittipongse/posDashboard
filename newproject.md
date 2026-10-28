# newproject.md — PosDashboard (Vendor Portal)

อ่านไฟล์นี้ก่อนสร้างหรือแก้โค้ดในโปรเจกต์ **PosDashboard** ทุกครั้ง  
ใช้ **posApp** (`C:\posApp`) เป็นแม่แบบสถาปัตยกรรม / สไตล์โค้ด / รูปแบบ API  
ห้ามเปลี่ยน Technology Stack หรือ Business Rule โดยไม่ได้รับคำสั่ง

---

## 0. Naming

| ใช้ชื่อนี้ | อย่าใช้ |
|---|---|
| **PosDashboard** (โฟลเดอร์ / ชื่อโปรเจกต์) | PosDashoard, posDashbard |
| package / API: `pos-dashboard`, `pos-dashboard-api` | — |
| บทบาทผู้ใช้พอร์ทัล: **VENDOR** (ตัวแทนร้านค้า / ผู้จำหน่าย) | อย่าสับสนกับ role พนักงาน POS (`MANAGER` / `CASHIER`) |

**ที่ตั้งโปรเจกต์:** `C:\PosDashboard` (แยกจาก `C:\posApp`)  
**ฐานข้อมูล:** ใช้ **MySQL ชุดเดียวกับ posApp** (Cloud / remote) — ไม่สร้าง schema คนละฐาน

### กฎ Auth ที่สำคัญที่สุด

| | posApp | PosDashboard |
|---|---|---|
| ใครเข้า | พนักงานบริษัท (`users`: admin / manager / cashier) | **ร้านค้า / Vendor** (`vendors.portal_*`) |
| หน้า Login | ของ posApp เท่านั้น | **ของ PosDashboard เท่านั้น** — คนละ URL / คนละแอป |
| ตั้งรหัส Vendor | Admin ตั้งในหน้าผู้จำหน่าย (ออกบัญชีให้ร้าน) | — ไม่ตั้งที่นี่ |
| ร้านค้า login ที่ไหน | **ห้าม** มีหน้า login ของร้านค้าใน posApp | `/login` ของ PosDashboard |

- บัญชี Vendor **ไม่ใช่** user ในตาราง `users` และ **ห้าม** โผล่ในหน้า Login ของ POS  
- JWT คนละ `JWT_SECRET` / คนละ `aud` — token ข้ามแอปใช้ไม่ได้  
- แชร์แค่ MySQL — **ไม่แชร์หน้า login / session / role พนักงาน**

---

## 1. Project Overview

### 1.1 ปัญหาที่แก้

ใน posApp มี **Vendor (ผู้จำหน่าย / ตัวแทนร้านค้า)** ที่นำสินค้ามาขายผ่านสาขาของบริษัท  
ปัจจุบันมีรายงาน `/reports/vendor-sales` เฉพาะพนักงานบริษัท (ADMIN / MANAGER)  
ตัวแทนร้านค้ายัง **ไม่มีบัญชีเข้าดูยอดสินค้าของตัวเอง**

### 1.2 ขอบเขต PosDashboard (V1)

ทำ:

- **หน้า Login ของร้านค้าเอง** (ไม่เกี่ยวกับ `/login` ของ posApp)
- เว็บพอร์ทัลแยกจาก POS — login ด้วย `vendors.portal_username` + รหัสพอร์ทัล
- ดูรายงานยอดขาย **เฉพาะสินค้าของ Vendor นั้นเท่านั้น** (บังคับ filter `vendor_id` จาก JWT)
- สรุปรายวัน / รายเดือน / ตามสาขา / ตามสินค้า
- Dashboard ยอดรวมช่วงวันที่เลือก
- Cloud / web only (Vercel) — **ไม่มี** โหมด Local shop / kiosk / พิมพ์ใบเสร็จ / ขายหน้าร้าน

ไม่ทำใน V1:

- ขาย POS / รับเงิน / พิมพ์ / LCD / EDC / PromptPay
- แก้ Master (สินค้า / สาขา / ผู้ใช้บริษัท / Vendor อื่น)
- ดูยอด Vendor อื่น หรือยอดรวมทั้งบริษัท
- Sync Local↔Cloud (เป็นหน้าที่ posApp)

### 1.3 ความสัมพันธ์กับ posApp

```
[posApp — บริษัท]                         [PosDashboard — ตัวแทนร้าน]
 Cloud Master + Local POS                   Cloud portal เท่านั้น
  - จัดการ Vendor + ตั้ง username/password    - Login ด้วยบัญชี Vendor
  - ขายสินค้า → sale_items.vendor_id          - อ่านรายงาน filter ตาม vendor_id
  - Push ยอดขึ้น Cloud MySQL  ───────────────►  อ่านฐานเดียวกัน (read-mostly)
```

- **แหล่งความจริงของยอดขาย:** ตาราง `sales` / `sale_items` / `payments` ของ posApp  
- **แหล่งความจริงของ Vendor + รหัสเข้าพอร์ทัล:** ตาราง `vendors` (+ คอลัมน์ login ที่เพิ่มใน posApp)  
- PosDashboard **ห้าม** เขียนบิลขาย หรือแก้สินค้า

---

## 2. Technology Stack (คัดลอกแบบ posApp)

### Frontend

- Vue 3 (Composition API + `<script setup>`)
- Vite
- Bootstrap 5 + Bootstrap Icons
- Vue Router + Pinia + Axios
- ApexCharts + vue3-apexcharts
- SweetAlert2
- JavaScript ES2022+

### Backend

- Node.js (engines ตรงกับ posApp เช่น `24.x`)
- Express.js
- mysql2/promise
- JWT + bcryptjs
- Zod validation
- dotenv, cors, helmet, express-rate-limit

### Database

- MySQL 8 / MariaDB (ชุดเดียวกับ posApp Cloud)
- InnoDB, `utf8mb4` / `utf8mb4_unicode_ci`
- Frontend **ห้าม** ต่อ MySQL โดยตรง — เรียก REST API เท่านั้น

### Production (แนะนำแยก project Vercel)

- Web: เช่น `https://vendor.znix.online` (หรือโดเมนที่กำหนดภายหลัง)
- API: เช่น `https://vendor-api.znix.online`
- DB: **ค่าเดียวกับ** posApp Cloud (`DB_REMOTE_*` / `DB_MODE=remote`)

---

## 3. posApp เป็นแม่แบบ — โครงสร้างที่ต้องเลียนแบบ

อ้างอิงโค้ดจริงที่ `C:\posApp` (ไม่ต้องคัดลอกโมดูล POS / print / sync)

### 3.1 Monorepo layout (เป้าหมาย PosDashboard)

```
PosDashboard/
├── newproject.md          ← ไฟล์นี้
├── README.md
├── .gitignore
├── package.json           ← optional workspace root
├── frontend/
│   ├── env.local          ← template (commit ได้)
│   ├── .env.local         ← secrets (gitignore)
│   ├── package.json
│   ├── vite.config.mjs
│   ├── index.html
│   └── src/
│       ├── main.js
│       ├── App.vue
│       ├── api/           ← axios.js + *.api.js
│       ├── components/common/
│       ├── composables/
│       ├── constants/
│       ├── layout/        ← AppLayout, AuthLayout, Sidebar, Topbar
│       ├── router/
│       ├── stores/        ← auth.store.js
│       ├── utils/
│       └── views/
│           ├── auth/LoginView.vue
│           ├── dashboard/DashboardView.vue
│           └── reports/   ← daily / monthly / by-product / by-branch
└── backend/
    ├── env.local
    ├── .env.local
    ├── package.json
    ├── vercel.json
    ├── sql/               ← migration เฉพาะพอร์ทัล (ถ้าจำเป็น)
    └── src/
        ├── app.js
        ├── server.js
        ├── config/        ← env.js, loadEnv.js, database.js, paths.js
        ├── constants/
        ├── middleware/    ← auth, validate, role
        ├── routes/
        ├── controllers/
        ├── services/
        ├── repositories/
        ├── validators/
        └── utils/         ← response.js, errors.js, jwt.js, asyncHandler.js, money.js
```

### 3.2 Backend layering (เหมือน posApp)

```
routes → controllers → services → repositories → MySQL
              ↑
         validators (Zod) + middleware (auth / role)
```

- `success` / `successList` / `fail` — คัดลอกรูปแบบจาก `posApp/backend/src/utils/response.js`
- `asyncHandler` + `AppError` / `UnauthorizedError` — ตาม posApp
- Config โหลดจาก `backend/.env.local` เท่านั้น (template: `backend/env.local`) — **ห้าม** กลับไปใช้ `.env.example`
- API prefix: `/api/v1/...`

### 3.3 Frontend patterns (เหมือน posApp)

- Axios instance + Bearer JWT จาก Pinia `auth.store`
- Router `meta.requiresAuth` / `meta.public`
- Layout: `AuthLayout` (login) + `AppLayout` (sidebar รายงาน)
- UI: Bootstrap 5, PageShell, TablePagination, StatusBadge สไตล์เดียวกับหลังบ้าน posApp
- รูปแบบเงิน/วันที่: คัดลอกแนว `format.js` / `date.js` จาก posApp

### 3.4 สิ่งใน posApp ที่ **ห้าม** นำมาทั้งก้อน

- POS / cart / receipt print / GDI / ESC-POS / LCD / TFT
- Local master lock / provision / migrate shop / start-pos.bat
- Cloud sync pull/push / Telegram แจ้งยอดสาขา
- Role SUPER_ADMIN / ADMIN / MANAGER / CASHIER ของพนักงานบริษัท (ยกเว้นถ้าทำหน้า admin ภายในภายหลัง — ไม่ใช่ V1)

---

## 4. Shared Database Model (จาก posApp)

ตารางหลักที่ PosDashboard **อ่าน**:

| ตาราง | ใช้ทำอะไร |
|---|---|
| `vendors` | ตัวตนร้านค้า + login พอร์ทัล |
| `products` | ชื่อสินค้า / sku / `vendor_id` |
| `sale_items` | บรรทัดขาย + **`vendor_id` snapshot** (สำคัญ) |
| `sales` | วันที่ / สาขา / สถานะ `PAID` |
| `branches` | ชื่อสาขาในรายงาน |
| `payments` | (ถ้าต้องการสรุปช่องทางชำระ — optional V1) |

กฎ attribution ยอดขาย (คัดลอกจาก posApp):

```sql
COALESCE(sale_items.vendor_id, products.vendor_id)
```

รายงานใน posApp อ้างอิง: `backend/src/repositories/report.repository.js` → `findVendorSales`  
route: `GET /api/v1/reports/vendor-sales`

---

## 5. งานที่ต้องทำใน posApp (ก่อน / คู่ขนานกับ PosDashboard)

PosDashboard จะ login ไม่ได้ถ้า posApp ยังไม่มีช่อง username/password ของ Vendor

### 5.1 Migration บนฐานเดียวกับ posApp

เพิ่มคอลัมน์บน `vendors` (แนะนำ — 1 vendor = 1 login):

```sql
-- ตัวอย่างชื่อไฟล์ใน posApp: backend/sql/017_vendor_portal_login.sql
ALTER TABLE vendors
  ADD COLUMN portal_username VARCHAR(64) NULL AFTER status,
  ADD COLUMN portal_password_hash VARCHAR(255) NULL AFTER portal_username,
  ADD COLUMN portal_enabled TINYINT(1) NOT NULL DEFAULT 0 AFTER portal_password_hash,
  ADD COLUMN portal_last_login_at DATETIME NULL AFTER portal_enabled;

ALTER TABLE vendors
  ADD UNIQUE KEY uk_vendors_portal_username (portal_username);
```

หมายเหตุ:

- `portal_username` เก็บแบบ normalize แล้ว (เช่น lower-case trim)
- รหัสเก็บ **bcrypt hash เท่านั้น** — ห้ามเก็บ plain text
- `portal_enabled = 0` หรือไม่มีรหัส → เข้า PosDashboard ไม่ได้
- **อย่า** ใส่บัญชี Vendor ลงตาราง `users` ของพนักงาน POS (คนละโดเมนสิทธิ์)

ทางเลือกที่ยอมรับได้ถ้าต้องการหลาย user ต่อร้านในอนาคต: ตาราง `vendor_users`  
แต่ V1 ใช้คอลัมน์บน `vendors` ให้จบ

### 5.2 UI / API ใน posApp (Cloud Admin)

ในหน้า **ผู้จำหน่าย** (`VendorListView` / vendor API):

- ตั้ง / เปลี่ยน `portal_username`
- ตั้งรหัสผ่านพอร์ทัล (พิมพ์ใหม่ → hash ฝั่ง server)
- เปิด/ปิด `portal_enabled`
- แสดงสถานะ “มีสิทธิ์เข้า PosDashboard” ในตาราง
- สิทธิ์แก้ได้เฉพาะ `SUPER_ADMIN` / `ADMIN` บน Cloud (ตามนโยบาย master ของ posApp)
- Local shop (`LOCAL_MASTER_LOCK`) **ห้าม** แก้ portal login (เหมือนห้ามแก้ master อื่น)

API แนวทาง (ใน posApp):

- `PATCH /api/v1/vendors/:id/portal-access`  
  body: `{ portalUsername?, portalPassword?, portalEnabled? }`

Sync Cloud → Local: ถ้า sync vendor อยู่แล้ว ให้รวมฟิลด์ portal หรือ **ไม่ sync hash ไป Local ก็ได้** (พอร์ทัลใช้ Cloud DB อย่างเดียว) — แนะนำ **portal login ใช้บน Cloud DB เท่านั้น** ไม่จำเป็นต้องอยู่เครื่องร้าน

### 5.3 ไม่ใช้บัญชี `users` ของ POS

| | posApp พนักงาน | PosDashboard Vendor |
|---|---|---|
| ตาราง | `users` | `vendors` (+ portal_*) |
| Role ใน JWT | SUPER_ADMIN / ADMIN / MANAGER / CASHIER | `VENDOR` |
| `aud` / issuer | เช่น `pos-app` | เช่น `pos-dashboard` |
| JWT_SECRET | ของ posApp | **คนละ secret** (แนะนำ) |

ห้ามรับ JWT ของ posApp มาใช้ใน PosDashboard และกลับกัน

---

## 6. PosDashboard Auth & Security

### 6.1 Login flow

1. `POST /api/v1/auth/login` `{ username, password }`
2. หา `vendors` ที่ `portal_username` ตรง + `portal_enabled = 1` + `status = 'ACTIVE'`
3. `bcrypt.compare` กับ `portal_password_hash`
4. ออก JWT:

```json
{
  "sub": "<vendor.id>",
  "username": "<portal_username>",
  "fullName": "<vendors.name>",
  "role": "VENDOR",
  "vendorId": "<vendor.id>",
  "vendorCode": "<vendor_code>",
  "vendorAbbr": "<abbr>",
  "aud": "pos-dashboard",
  "lastActivity": <epoch_sec>
}
```

5. อัปเดต `portal_last_login_at`
6. Frontend เก็บ token ใน Pinia (+ localStorage ตามแบบ posApp auth store)

### 6.2 Middleware

- `requireVendorAuth` — ตรวจ Bearer JWT, บังคับ `role === 'VENDOR'` และมี `vendorId`
- **ทุก** query รายงานต้องใช้ `req.user.vendorId` จาก token เท่านั้น  
  **ห้าม** รับ `vendorId` จาก query/body ของ client มาขยายสิทธิ์

### 6.3 CORS / env

```
# backend/.env.local (ตัวอย่าง)
NODE_ENV=production
PORT=3010
DB_MODE=remote
DB_REMOTE_HOST=...
DB_REMOTE_PORT=3306
DB_REMOTE_NAME=cp393722_posdhh   # ชื่อเดียวกับ posApp Cloud
DB_REMOTE_USER=...
DB_REMOTE_PASSWORD=...
JWT_SECRET=<ต่างจาก posApp>
JWT_EXPIRES_IN=8h
FRONTEND_URL=https://vendor.znix.online,http://localhost:5174
```

Frontend:

```
VITE_SERVER=cloud
VITE_API_BASE_URL=https://vendor-api.znix.online/api/v1
```

---

## 7. PosDashboard API (V1)

Base: `/api/v1`

| Method | Path | คำอธิบาย |
|---|---|---|
| POST | `/auth/login` | Login Vendor |
| GET | `/auth/me` | โปรไฟล์จาก token |
| POST | `/auth/logout` | optional audit |
| GET | `/health` | health + db ping |
| GET | `/reports/summary` | การ์ดยอดรวม (ช่วงวันที่) |
| GET | `/reports/daily` | ยอดรายวัน |
| GET | `/reports/monthly` | ยอดรายเดือน |
| GET | `/reports/by-product` | แตกตามสินค้าของ vendor |
| GET | `/reports/by-branch` | แตกตามสาขาที่ขายสินค้า vendor |

Query ร่วม: `dateFrom`, `dateTo`, `branchId?`  
ทุก endpoint ใส่เงื่อนไขภายใน:

```sql
AND COALESCE(si.vendor_id, p.vendor_id) = ?   -- = req.user.vendorId
AND s.status = 'PAID'
```

อย่าเปิด endpoint ที่คืนรายการ Vendor อื่น / ผู้ใช้บริษัท / ตั้งค่าสาขา

---

## 8. PosDashboard UI (V1)

1. **Login** — ชื่อแอป PosDashboard / แบรนด์บริษัท (อ่านจาก `company` ได้ถ้าต้องการ)
2. **Dashboard** — ยอดขายช่วงนี้, จำนวนบิล, จำนวนชิ้น, กราฟรายวัน (ApexCharts)
3. **รายงานรายวัน**
4. **รายงานรายเดือน**
5. **รายงานตามสินค้า**
6. **รายงานตามสาขา**
7. Logout

เมนูสั้น ชัด — ไม่มี POS / สินค้า / ผู้ใช้ / สาขา CRUD

---

## 9. Implementation Order (แนะนำให้ Cursor ทำตาม)

### Phase A — posApp (shared DB) ✅ ทำใน posApp แล้ว

1. SQL `017_vendor_portal_login.sql` + `ensureVendorPortalColumns` — ✅
2. Vendor repository/service/validator รองรับ portal fields — ✅
3. API `PUT /vendors/:id` + `PATCH /vendors/:id/portal-access` — ✅
4. UI หน้า VendorList: Username / รหัสผ่าน / เปิด PosDashboard — ✅
5. Migrate บน Cloud DB จริง + ทดสอบตั้งรหัสให้ Vendor หนึ่งราย — ทำตอน deploy/migrate

### Phase B — scaffold PosDashboard

1. สร้าง `frontend/` + `backend/` ตามโครงสร้างข้อ 3
2. คัดลอก/ดัดแปลงเฉพาะ: config DB, response/errors/jwt, axios, auth store, layouts ว่าง
3. Login + `/auth/me` ทำงานกับ Cloud DB

### Phase C — reports

1. Repository รายงาน (reuse SQL แนว `findVendorSales` แต่ lock `vendorId`)
2. หน้า Dashboard + รายงาน 4 แบบ
3. ทดสอบ: Vendor A มองไม่เห็นยอด Vendor B

### Phase D — deploy

1. Vercel frontend + API คนละโปรเจกต์กับ posApp
2. ตั้ง env ให้ชี้ DB เดียวกับ posApp Cloud
3. เอกสารใน README: วิธีสร้างบัญชีจากหน้า Vendor ของ posApp

---

## 10. Coding Rules (ยึดจาก posApp / cursor.md)

1. แยกชั้น routes / controllers / services / repositories ชัดเจน
2. Validate ด้วย Zod ทุก input
3. เงินใช้ helper round แบบ posApp (`money.js`) — อย่าคำนวณ float เปล่าๆ
4. ชื่อฟิลด์ API เป็น camelCase; คอลัมน์ DB เป็น snake_case; map ใน repository
5. ข้อความ UI ภาษาไทยเป็นหลัก
6. ไม่ commit `.env.local`, dump DB, หรือรหัสผ่านจริง
7. ไม่สร้าง POS / print / sync ใน PosDashboard
8. Security: บังคับ scope `vendorId` จาก JWT ทุก query — นี่คือกฎสูงสุดของโปรเจกต์นี้

---

## 11. Acceptance Criteria (V1)

- [ ] Admin บน posApp Cloud ตั้ง username + password + เปิด portal ให้ Vendor ได้
- [ ] Vendor login ที่ PosDashboard สำเร็จด้วยรหัสนั้น
- [ ] Vendor เห็นเฉพาะยอดสินค้าที่ `COALESCE(si.vendor_id, p.vendor_id)` = vendor ของตน
- [ ] ลองสลับสอง Vendor แล้วยอดไม่ปน
- [ ] Vendor ปิด `portal_enabled` หรือ `status != ACTIVE` แล้ว login ไม่ได้
- [ ] JWT ของ posApp ใช้กับ PosDashboard ไม่ได้ (และกลับกัน)
- [ ] ไม่มีหน้าขาย / แก้ master ใน PosDashboard

---

## 12. Reference paths ใน posApp (อ่านก่อนลงมือ)

| หัวข้อ | Path |
|---|---|
| Blueprint หลัก | `C:\posApp\cursor.md` |
| Vendor table / seed | `backend/sql/001_create_pos_tables.sql`, `015_vendor_abbr.sql` |
| Vendor API | `backend/src/services/vendor.service.js`, `repositories/vendor.repository.js` |
| Vendor UI | `frontend/src/views/vendors/VendorListView.vue` |
| Vendor sales report | `backend/src/repositories/report.repository.js` (`findVendorSales`) |
| Auth login (พนักงาน) | `backend/src/services/auth.service.js` |
| Roles | `backend/src/constants/roles.js` |
| sale_items.vendor_id | `backend/sql/013_sale_items_vendor.sql` |
| Env template | `backend/env.local`, `frontend/env.local` |
| Response helpers | `backend/src/utils/response.js` |

---

## 13. Out of scope / ตัดสินใจภายหลัง

- Vendor เปลี่ยนรหัสเองในพอร์ทัล
- หลาย user ต่อหนึ่ง Vendor
- Export Excel / PDF
- แจ้งเตือน Telegram ถึง Vendor
- Mobile native app
- การมองเห็น **ต้นทุน / กำไร** — V1 แนะนำแสดงเฉพาะ **ยอดขาย (amount) + qty + bills**; ซ่อน cost/profit จนกว่าธุรกิจจะยืนยัน (ตัวแทนอาจไม่ควรเห็นต้นทุนสาขา)

ถ้ายังไม่ระบุ ให้เริ่ม V1 **ไม่โชว์ cost/profit** ใน PosDashboard
