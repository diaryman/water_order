# คู่มือการติดตั้งและใช้งานบน Docker Server

## สิ่งที่ต้องเตรียม (Prerequisites)
1. ติดตั้ง **Docker** และ **Docker Compose** บนเครื่อง Server
2. ไฟล์โปรเจคทั้งหมด (สามารถ git clone หรือ copy ไปวางบน server)

## โครงสร้างโฟลเดอร์สำหรับ Deploy
ตรวจสอบว่ามีไฟล์เหล่านี้:
- `docker-compose.yml`
- `Dockerfile`
- `deploy.sh`
- `prisma/` (โฟลเดอร์ schema)
- `public/`

## ขั้นตอนการติดตั้ง (Installation)

1. **ให้สิทธิ์การรันไฟล์ deploy script**
   ```bash
   chmod +x deploy.sh
   ```

2. **รันสคริปต์ติดตั้งอัตโนมัติ**
   ```bash
   ./deploy.sh
   ```
   สคริปต์จะทำการ:
   - สร้างโฟลเดอร์ที่จำเป็น (`public/uploads`, `prisma`)
   - ตั้งค่า Permission (เพื่อให้ Docker เขียนไฟล์ได้)
   - สร้างและรัน Container
   - อัปเดตโครงสร้างฐานข้อมูล (Migration)

3. **การสร้าง User Admin เริ่มต้น (ครั้งแรก)**
   หากเป็นฐานข้อมูลใหม่ ให้รันคำสั่งนี้เพื่อสร้าง Admin (user: admin / pass: water1234 หรือตามที่ตั้งใน seed):
   ```bash
   docker-compose exec app npx prisma db seed
   ```

## คำสั่งอื่นๆ ที่สำคัญ

- **ดูสถานะการทำงาน (Logs) แบบ Realtime**
  ```bash
  docker-compose logs -f
  ```

- **หยุดการทำงาน**
  ```bash
  docker-compose down
  ```

- **รีสตาร์ทระบบ**
  ```bash
  docker-compose restart
  ```

- **อัปย้าย Database/Schema ใหม่** (หลังจากอัปเดตโค้ดที่มีการแก้ DB)
  ```bash
  docker-compose exec app npx prisma migrate deploy
  ```

## การแก้ปัญหาเบื้องต้น (Troubleshooting)

- **Permission Denied (Database/Uploads):**
  หากเจอ error ว่าเขียนไฟล์ไม่ได้ ให้รันคำสั่งแก้สิทธิ์:
  ```bash
  chmod -R 777 prisma public/uploads
  ```

- **Database Locked / Error:**
  ลองลบไฟล์ `prisma/dev.db` (ข้อมูลจะหาย!) แล้วรัน `./deploy.sh` ใหม่
