# คู่มือการติดตั้งและใช้งานระบบ Water Ordering System

เอกสารนี้อธิบายวิธีการติดตั้งระบบ Water Ordering System ในรูปแบบต่างๆ ได้แก่
1. ติดตั้งด้วย Docker บน Ubuntu Server (Linux) - **วิธีแนะนำ**
2. ติดตั้งด้วย Docker บน Windows (Docker Desktop)
3. ติดตั้งแบบปกติ (Manual Installation)

---

## สิ่งที่ต้องเตรียม (Prerequisites)
- **Git**: สำหรับดาวน์โหลด Source Code
- **Docker & Docker Compose**: สำหรับวิธีติดตั้งแบบ Docker

---

## 1. การติดตั้งบน Ubuntu Server ด้วย Docker (แนะนำ)

วิธีนี้เสถียรที่สุดสำหรับการใช้งานจริง

### ขั้นตอนการติดตั้ง
1. **ติดตั้ง Docker และ Docker Compose** (หากยังไม่มี)
   ```bash
   sudo apt update
   sudo apt install docker.io docker-compose -y
   sudo systemctl enable --now docker
   ```

2. **Clone โค้ดจาก GitHub**
   ```bash
   # ล้างของเก่าก่อน (ถ้ามีปัญหาก่อนหน้านี้)
   # rm -rf water_order
   
   git clone https://github.com/diaryman/water_order.git
   cd water_order
   ```

3. **รันระบบ (Build & Start)**
   ```bash
   sudo docker compose up -d --build
   ```
   *รอสักครู่ ระบบจะทำการ Build image และเริ่มทำงาน*

4. **ตั้งค่าสิทธิ์ (Permissions) ** (สำคัญมาก! หากข้ามขั้นตอนนี้จะบันทึกข้อมูลไม่ได้)
   ```bash
   # อนุญาตให้ Docker เขียนไฟล์ Database และ Uploads ได้
   sudo chmod -R 777 prisma
   sudo chmod -R 777 public/uploads
   ```

5. **เตรียม Database และข้อมูลเริ่มต้น**
   ```bash
   # สร้างตารางใน Database (ระบุเวอร์ชั่นให้ตรงกัน)
   sudo docker compose exec -u root app npx prisma@5.22.0 db push
   
   # เติมข้อมูลเริ่มต้น (Seed) เช่น รายชื่อหน่วยงาน สินค้า
   sudo docker compose exec -u root app npx tsx prisma/seed.ts
   ```

6. **เข้าใช้งาน**
   เปิด Browser และเข้าผ่าน IP ของ Server ที่ Port 3000
   `http://YOUR_SERVER_IP:3000`

---

## 2. การติดตั้งบน Windows ด้วย Docker Desktop

### ขั้นตอนการติดตั้ง
1. **ติดตั้ง Docker Desktop** (Windows)
2. **Clone Code**: `git clone https://github.com/diaryman/water_order.git`
3. **รันระบบ**: 
   ```powershell
   cd water_order
   docker compose up -d --build
   ```
4. **เตรียม Database**:
   ```powershell
   docker compose exec app npx prisma db push
   docker compose exec app npx tsx prisma/seed.ts
   ```
5. **เข้าใช้งาน**: `http://localhost:3000`

---

## โครงสร้างระบบ (System Structure)

- **Frontend**: Next.js 15 (App Router)
- **Backend API**: Next.js Server Actions
- **Database**: SQLite (ผ่าน Prisma ORM)
- **Styling**: Bootstrap 5 + Custom CSS
- **Authentication**: Admin Session Cookies

### ไฟล์สำคัญ
- `app/`: โค้ดหลักของหน้าเว็บและ API
- `prisma/schema.prisma`: โครงสร้างฐานข้อมูล
- `docker-compose.yml`: การตั้งค่า Docker Environment
- `public/uploads`: โฟลเดอร์เก็บรูปสลิปและ QR Code

---

## 3. การแก้ไขปัญหา (Troubleshooting)

### 3.1. Error: "attempt to write a readonly database"
**อาการ:** กดสั่งซื้อแล้วขึ้น error หรือ log ฟ้องว่า readonly database
**วิธีแก้:** ไฟล์ Database (`dev.db`) ถูกสร้างโดย root ทำให้เว็บเขียนไม่ได้
```bash
sudo chmod -R 777 prisma
sudo docker compose restart app
```

### 3.2. Error: "EACCES: permission denied"
**อาการ:** รันคำสั่ง npx แล้วขึ้น permission denied
**วิธีแก้:** รันคำสั่งโดยระบุ user root
```bash
sudo docker compose exec -u root app ...
```

### 3.3. Login แล้วเด้งออกตลอด (Loop Login)
**อาการ:** ล็อกอินผ่านแต่พอกดเมนูอื่นก็ให้ล็อกอินใหม่
**สาเหตุ:** Cookie ถูกตั้งเป็น Secure (สำหรับ HTTPS) แต่รันบน HTTP
**วิธีแก้:** โค้ดเวอร์ชั่นล่าสุดได้ปลดล็อคส่วนนี้แล้ว ให้ทำการ Build ใหม่
```bash
git pull
sudo docker compose up -d --build
```
