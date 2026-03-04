import { z } from 'zod';

export const LoginSchema = z.object({
    username: z.string().min(1, 'กรุณากรอกชื่อผู้ใช้'),
    password: z.string().min(1, 'กรุณากรอกรหัสผ่าน')
});

export const CreateGroupSchema = z.object({
    name: z.string().min(1, 'กรุณากรอกชื่อกลุ่ม')
});

export const CreateMemberSchema = z.object({
    name: z.string().min(1, 'กรุณากรอกชื่อสมาชิก'),
    groupId: z.number().int().positive('กรุณาเลือกกลุ่ม')
});

export const CreateProductSchema = z.object({
    name: z.string().min(1, 'กรุณากรอกชื่อสินค้า'),
    price: z.number().min(0, 'ราคาต้องมากกว่าหรือเท่ากับ 0'),
    type: z.enum(['SMALL', 'LARGE'], { message: 'กรุณาเลือกประเภทสินค้า' }),
    isAvailable: z.boolean().optional().default(true)
});

export const CreateRoundSchema = z.object({
    name: z.string().min(1, 'กรุณากรอกชื่อรอบ')
});

export const CreateOrderSchema = z.object({
    memberId: z.number().int().positive('กรุณาเลือกสมาชิก'),
    items: z.array(z.object({
        productId: z.number().int().positive('รหัสสินค้าไม่ถูกต้อง'),
        quantity: z.number().int().min(1, 'จำนวนต้องมากกว่า 0'),
        price: z.number().min(0, 'ราคาไม่ถูกต้อง')
    })).min(1, 'กรุณาเลือกสินค้าอย่างน้อย 1 รายการ'),
    total: z.number().min(0, 'ยอดรวมไม่ถูกต้อง'),
    slipUrl: z.string().optional(),
    status: z.string().optional(),
    slips: z.array(z.object({
        url: z.string(),
        bank: z.string(),
        amount: z.number(),
        date: z.string(),
        time: z.string()
    })).optional()
});
