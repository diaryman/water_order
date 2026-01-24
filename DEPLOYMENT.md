# คู่มือการติดตั้งและใช้งานระบบ Water Ordering System

เอกสารนี้อธิบายวิธีการติดตั้งระบบ Water Ordering System ในรูปแบบต่างๆ ได้แก่
1. ติดตั้งด้วย Docker บน Ubuntu Server (Linux)
2. ติดตั้งด้วย Docker บน Windows (Docker Desktop)
3. ติดตั้งแบบปกติ (Manual Installation) บน Server ทั่วไป

---

## สิ่งที่ต้องเตรียม (Prerequisites)
- **Git**: สำหรับดาวน์โหลด Source Code
- **Docker & Docker Compose**: สำหรับวิธีติดตั้งแบบ Docker
- **Node.js (v18 ขึ้นไป)**: สำหรับวิธีติดตั้งแบบปกติ

---

## 1. การติดตั้งบน Ubuntu Server ด้วย Docker (แนะนำ)

วิธีนี้ง่ายที่สุดสำหรับการ Deploy บน Production server

### ขั้นตอนการติดตั้ง
1. **ติดตั้ง Docker และ Docker Compose** (หากยังไม่มี)
   ```bash
   sudo apt update
   sudo apt install docker.io docker-compose -y
   sudo systemctl enable --now docker
   ```

2. **Clone โค้ดจาก GitHub**
   ```bash
   git clone https://github.com/diaryman/water_order.git
   cd water_order
   ```

3. **(Optional) ตั้งค่า Database**
   โดยปกติระบบจะใช้ SQLite (`dev.db`) ซึ่งตั้งค่าไว้แล้วใน `docker-compose.yml`
   หากต้องการแก้ไข Port หรือตั้งค่าอื่นๆ สามารถแก้ไขไฟล์ `docker-compose.yml` ได้

4. **รันระบบ**
   ```bash
   sudo docker-compose up -d --build
   ```
   *รอสักครู่ ระบบจะทำการ Build image และเริ่มทำงาน*

5. **เข้าใช้งาน**
   เปิด Browser และเข้าผ่าน IP ของ Server ที่ Port 3000
   `http://YOUR_SERVER_IP:3000`

---

## 2. การติดตั้งบน Windows ด้วย Docker Desktop

### ขั้นตอนการติดตั้ง
1. **ติดตั้ง Docker Desktop**
   - ดาวน์โหลดและติดตั้ง [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/)

2. **ดาวน์โหลด Source Code**
   - Clone ผ่าน Git Bash:
     ```bash
     git clone https://github.com/diaryman/water_order.git
     ```
   - หรือดาวน์โหลดเป็น ZIP File แล้วแตกไฟล์ออกมา

3. **เปิด Terminal (PowerShell หรือ Git Bash)**
   เข้าไปที่โฟลเดอร์ของโปรเจกต์
   ```bash
   cd water_order
   ```

4. **รันระบบ**
   ```bash
   docker-compose up
   ```
   *รอจนกว่าจะขึ้นข้อความว่า Ready*

5. **เข้าใช้งาน**
   เปิด Browser ไปที่ `http://localhost:3000`

---

## 3. การติดตั้งแบบปกติ (บน Server Linux หรือ Windows)

วิธีนี้เหมาะสำหรับผู้ที่ต้องการรัน Node.js โดยตรง หรือใช้ hosting ที่รองรับ Node.js

### ขั้นตอนการติดตั้ง
1. **ติดตั้ง Node.js**
   - ตรวจสอบว่ามี Node.js รุ่น 18+ หรือไม่: `node -v`

2. **Clone โค้ดและติดตั้ง Dependencies**
   ```bash
   git clone https://github.com/diaryman/water_order.git
   cd water_order
   npm install
   ```

3. **เตรียม Database**
   ```bash
   npx prisma generate
   # สร้างฐานข้อมูล SQLite (dev.db)
   npx prisma db push 
   ```

4. **Build โปรเจกต์**
   ```bash
   npm run build
   ```

5. **รันระบบ**
   ```bash
   npm start
   ```
   *ระบบจะทำงานที่ Port 3000*

### Tips สำหรับการรันบน Server (Ubuntu) เพื่อให้ทำงานตลอดเวลา
แนะนำให้ใช้ **PM2** เพื่อจัดการ Process

```bash
# ติดตั้ง PM2
sudo npm install -g pm2

# รันระบบด้วย PM2
pm2 start npm --name "water-order" -- start

# ตั้งค่าให้รันอัตโนมัติเมื่อเปิดเครื่อง
pm2 startup
pm2 save
```

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

## การแก้ไขปัญหาเบื้องต้น (Troubleshooting)

### 1. Application Error (Server-side exception)
หากรันแล้วเจอปัญหา `Application error: a server-side exception has occurred` ให้ลองตรวจสอบ Logs ด้วยคำสั่ง:
```bash
docker logs water-ordering-system
```

### 2. ปัญหา Database
หากพบ Error เกี่ยวกับ database หรือ "file not found":
- ตรวจสอบว่าในเครื่อง Server มีไฟล์ `prisma/dev.db` อยู่จริง
- **ระวัง**: หากไม่มีไฟล์นี้ Docker อาจจะสร้าง `dev.db` เป็น "โฟลเดอร์" แทน ซึ่งจะทำให้ระบบพัง ให้ลบโฟลเดอร์ `prisma/dev.db` ทิ้ง แล้วสร้างไฟล์เปล่าๆ หรือก๊อปปี้จากเครื่อง local ไปวางแทน
