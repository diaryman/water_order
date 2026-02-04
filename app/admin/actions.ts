'use server'

import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'
import { LoginSchema, CreateGroupSchema, CreateMemberSchema, CreateProductSchema } from '@/lib/schemas';
import { checkRateLimit } from '@/lib/ratelimit';
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'default-secret-key-change-this-in-prod')
const COOKIE_NAME = 'admin_session'

// Authentication
export async function login(prevState: any, formData: FormData) {
    const headerStore = await headers()
    const ip = headerStore.get('x-forwarded-for') || 'unknown'
    if (!checkRateLimit(ip)) {
        return { error: 'ทำรายการถี่เกินไป กรุณารอสักครู่ (Rate Limit)' }
    }
    const username = formData.get('username') as string // Changed from passcode to username
    const password = formData.get('password') as string // Changed from passcode to password

    const validation = LoginSchema.safeParse({ username, password });
    if (!validation.success) {
        return { error: validation.error.issues[0].message }
    }

    try {
        const admin = await prisma.admin.findUnique({
            where: { username }
        })

        if (!admin || !bcrypt.compareSync(password, admin.passwordHash)) {
            return { error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' }
        }

        // Create JWT
        const token = await new SignJWT({ id: admin.id, username: admin.username })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime('24h')
            .sign(JWT_SECRET)

        const cookieStore = await cookies()
        cookieStore.set(COOKIE_NAME, token, {
            httpOnly: true,
            secure: false, // Allow HTTP access (set to true if using HTTPS)
            maxAge: 60 * 60 * 24,
            path: '/',
            sameSite: 'lax',
        })
        try {
            await prisma.auditLog.create({
                data: {
                    action: 'LOGIN',
                    details: `User: ${username}`,
                    ip: ip
                }
            });
        } catch (e) {
            console.error("Audit Log Error:", e);
        }
    } catch (error) {
        console.error("Login error:", error)
        return { error: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ' }
    }

    redirect('/admin/dashboard')
}

export async function logout() {
    const cookieStore = await cookies()
    cookieStore.delete(COOKIE_NAME)
    redirect('/admin/login')
}

export async function checkAuth() {
    const cookieStore = await cookies()
    const token = cookieStore.get(COOKIE_NAME)?.value

    if (!token) return false

    try {
        const { payload } = await jwtVerify(token, JWT_SECRET)
        return !!payload
    } catch (err) {
        return false
    }
}


// --- Groups & Members ---
export async function getGroups() {
    return await prisma.group.findMany({
        include: { members: true },
        orderBy: { name: 'asc' }
    })
}

export async function createGroup(name: string) {
    const validation = CreateGroupSchema.safeParse({ name });
    if (!validation.success) return { error: validation.error.issues[0].message };
    const existing = await prisma.group.findFirst({
        where: { name }
    })

    if (existing) {
        return { error: 'ชื่อกลุ่มงานนี้มีอยู่แล้ว' }
    }

    await prisma.group.create({
        data: { name }
    })
    try {
        const headerStore = await headers()
        const ip = headerStore.get('x-forwarded-for') || 'unknown'
        await prisma.auditLog.create({
            data: {
                action: 'CREATE_GROUP',
                details: `Name: ${name}`,
                ip: ip
            }
        });
    } catch (e) {
        console.error("Audit Log Error:", e);
    }

    return { success: true }
}

export async function updateGroup(id: number, name: string) {
    const existing = await prisma.group.findFirst({
        where: { name, NOT: { id } }
    })

    if (existing) {
        return { error: 'ชื่อกลุ่มงานนี้มีอยู่แล้ว' }
    }

    await prisma.group.update({
        where: { id },
        data: { name }
    })

    return { success: true }
}

export async function deleteGroup(id: number) {
    const group = await prisma.group.findUnique({
        where: { id },
        include: {
            members: {
                include: { orders: true }
            }
        }
    })

    if (!group) return { error: 'ไม่พบกลุ่มงาน' }

    // Check if any member has orders
    const hasOrders = group.members.some((m: any) => m.orders.length > 0)

    if (hasOrders) {
        return { error: `ไม่สามารถลบได้ เนื่องจากมีสมาชิกในกลุ่มนี้ที่มีประวัติการสั่งซื้อ` }
    }

    // Delete members first (manually cascade)
    await prisma.member.deleteMany({
        where: { groupId: id }
    })

    // Delete group
    await prisma.group.delete({
        where: { id }
    })

    return { success: true }
}

export async function createMember(name: string, groupId: number) {
    const validation = CreateMemberSchema.safeParse({ name, groupId });
    if (!validation.success) return { error: validation.error.issues[0].message };
    // Check duplicates
    const existing = await prisma.member.findFirst({
        where: { name, groupId }
    })

    if (existing) {
        return { error: 'มีรายชื่อนี้อยู่ในกลุ่มงานแล้ว' }
    }

    await prisma.member.create({
        data: { name, groupId }
    })
    try {
        const headerStore = await headers()
        const ip = headerStore.get('x-forwarded-for') || 'unknown'
        await prisma.auditLog.create({
            data: {
                action: 'CREATE_MEMBER',
                details: `Name: ${name}, GroupId: ${groupId}`,
                ip: ip
            }
        });
    } catch (e) {
        console.error("Audit Log Error:", e);
    }

    return { success: true }
}

export async function updateMember(id: number, name: string, groupId: number) {
    // Check duplicates in target group (excluding self)
    const existing = await prisma.member.findFirst({
        where: {
            name,
            groupId,
            NOT: { id }
        }
    })

    if (existing) {
        return { error: 'มีรายชื่อนี้อยู่ในกลุ่มงานแล้ว' }
    }

    await prisma.member.update({
        where: { id },
        data: { name, groupId }
    })

    return { success: true }
}

export async function deleteMember(id: number) {
    try {
        await prisma.member.delete({
            where: { id }
        })
        return { success: true }
    } catch (error) {
        console.error("Delete Member Error:", error);
        return { error: 'ไม่สามารถลบได้ (อาจมีประวัติการสั่งซื้อ)' }
    }
}

export async function importMembersCSV(csvContent: string) {
    // Remove BOM if exists
    const cleanContent = csvContent.replace(/^\uFEFF/, '');
    // Handle various line endings (Windows \r\n, Mac \r, Unix \n)
    const lines = cleanContent.split(/\r\n|\n|\r/).filter(line => line.trim() !== '');

    let count = 0;
    let skipped = 0;
    let errors: string[] = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Handle potential commas in quoted fields (basic support)
        // If not needed, simple split is fine, but let's stick to split(',') for now as name/group shouldn't have commas usually.
        // If they do, we'd need a real CSV parser library.
        const parts = line.split(',');
        if (parts.length < 2) {
            skipped++;
            continue;
        }

        // Simple CSV: Name, GroupName
        const name = parts[0].trim();
        const groupName = parts[1].trim();

        if (!name || !groupName) {
            skipped++;
            continue;
        }

        // Skip header
        if (name === 'ชื่อ-สกุล' || name.toLowerCase() === 'name') {
            continue; // Don't count header as skipped or success
        }

        try {
            let group = await prisma.group.findFirst({
                where: { name: groupName }
            });

            if (!group) {
                group = await prisma.group.create({
                    data: { name: groupName }
                });
            }

            // Check duplicate member
            const existing = await prisma.member.findFirst({
                where: { name, groupId: group.id }
            })

            if (!existing) {
                await prisma.member.create({
                    data: {
                        name,
                        groupId: group.id
                    }
                });
                count++;
            } else {
                skipped++;
                // Optional: errors.push(`บรรทัด ${i + 1}: รายชื่อซ้ำ (${name})`);
            }
        } catch (error) {
            console.error(error);
            errors.push(`บรรทัด ${i + 1}: เกิดข้อผิดพลาด (${name})`);
        }
    }

    return { success: true, count, skipped, errors };
}


// --- Products ---
export async function getAdminProducts() {
    return await prisma.product.findMany({
        orderBy: { id: 'asc' }
    });
}

export async function createProduct(name: string, price: number, type: string) {
    // Note: type comes as string, Schema expects specific enum.
    // We might need to cast or let Zod validate it.
    const validation = CreateProductSchema.safeParse({ name, price, type: type as any });
    if (!validation.success) return { error: validation.error.issues[0].message };
    await prisma.product.create({
        data: { name, price, type, isAvailable: true }
    })
    try {
        const headerStore = await headers()
        const ip = headerStore.get('x-forwarded-for') || 'unknown'
        await prisma.auditLog.create({
            data: {
                action: 'CREATE_PRODUCT',
                details: `Name: ${name}, Price: ${price}`,
                ip: ip
            }
        });
    } catch (e) {
        console.error("Audit Log Error:", e);
    }
    return { success: true }
}

export async function deleteProduct(id: number) {
    try {
        await prisma.product.delete({ where: { id } })
        return { success: true }
    } catch (err) {
        return { error: 'ไม่สามารถลบได้ เนื่องจากมีประวัติการสั่งซื้อสินค้านี้' }
    }
}

export async function updateProductPrice(id: number, price: number) {
    await prisma.product.update({
        where: { id },
        data: { price }
    });
}

export async function toggleProductAvailability(id: number, isAvailable: boolean) {
    await prisma.product.update({
        where: { id },
        data: { isAvailable }
    });
}

// --- Payment Methods ---
export async function getAdminPaymentMethods() {
    return await prisma.paymentMethod.findMany();
}

export async function createPaymentMethod(bankName: string, accountName: string, accountNumber: string, qrCodeUrl?: string) {
    await prisma.paymentMethod.create({
        data: { bankName, accountName, accountNumber, qrCodeUrl, isActive: true }
    })
    return { success: true }
}

export async function updatePaymentMethod(id: number, bankName: string, accountName: string, accountNumber: string, qrCodeUrl?: string) {
    await prisma.paymentMethod.update({
        where: { id },
        data: { bankName, accountName, accountNumber, qrCodeUrl }
    })
    return { success: true }
}

export async function deleteRound(id: number) {
    try {
        // Check if round has any orders
        const orderCount = await prisma.order.count({
            where: { roundId: id }
        });

        if (orderCount > 0) {
            return { error: `ไม่สามารถลบรอบได้ เนื่องจากมี ${orderCount} รายการสั่งซื้อในรอบนี้` };
        }

        // Delete the round
        await prisma.orderRound.delete({
            where: { id }
        });

        return { success: true };
    } catch (error) {
        return { error: 'เกิดข้อผิดพลาดในการลบรอบ' };
    }
}

export async function deletePaymentMethod(id: number) {
    await prisma.paymentMethod.delete({ where: { id } })
    return { success: true }
}

export async function togglePaymentMethod(id: number, isActive: boolean) {
    await prisma.paymentMethod.update({
        where: { id },
        data: { isActive }
    })
}

// --- Orders ---
export async function getAdminOrders(roundId?: number) {
    const whereClause: any = {};
    if (roundId && roundId > 0) {
        whereClause.roundId = roundId;
    }

    return await prisma.order.findMany({
        where: whereClause,
        include: {
            member: { include: { group: true } },
            items: { include: { product: true } },
            round: true
        },
        orderBy: { createdAt: 'desc' }
    });
}

export async function updateOrderStatus(id: number, status: string) {
    await prisma.order.update({
        where: { id },
        data: { status }
    })
    try {
        const headerStore = await headers()
        const ip = headerStore.get('x-forwarded-for') || 'unknown'
        await prisma.auditLog.create({
            data: {
                action: 'UPDATE_ORDER_STATUS',
                details: `Order: ${id}, Status: ${status}`,
                ip: ip
            }
        });
    } catch (e) {
        console.error("Audit Log Error:", e);
    }
}

export async function deleteOrder(id: number) {
    // Items will be deleted automatically if cascade is set in schema
    // In our schema it is not, so we delete items first.
    await prisma.orderItem.deleteMany({
        where: { orderId: id }
    })
    await prisma.order.delete({
        where: { id }
    })
    return { success: true }
}

// --- File Upload ---
import fs from 'fs'
import path from 'path'

export async function uploadFile(formData: FormData) {
    const file = formData.get('file') as File
    if (!file) return null

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const uploadDir = path.join(process.cwd(), 'public/uploads')
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true })
    }

    // Sanitize filename and use timestamp
    const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
    const filepath = path.join(uploadDir, filename)
    fs.writeFileSync(filepath, buffer)

    return `/uploads/${filename}`
}

export const uploadSlip = uploadFile; // Alias for backward compatibility
// Get dashboard stats with optional filtering
export async function getDashboardStats(roundId?: number, search?: string, status?: string) {
    const whereClause: any = {};
    if (roundId && roundId > 0) {
        whereClause.roundId = roundId;
    }

    // Apply search filter to orders if provided
    if (search) {
        whereClause.OR = [
            { member: { name: { contains: search } } },
            { id: !isNaN(Number(search)) ? Number(search) : undefined }
        ].filter(Boolean);
    }

    // Apply status filter
    if (status && status !== 'ALL') {
        whereClause.status = status;
    }

    // 1. Basic Counts
    const totalMembers = await prisma.member.count();
    const totalOrders = await prisma.order.count({ where: whereClause });

    // 2. Revenue & Water Counts
    // We need to aggregate from items for precise product type counts
    const allItems = await prisma.orderItem.findMany({
        where: {
            order: whereClause
        },
        include: { product: true }
    });

    let totalRevenue = 0;
    let totalSmall = 0;
    let totalLarge = 0;

    allItems.forEach((item: any) => {
        totalRevenue += item.price * item.quantity;
        if (item.product.type === 'SMALL') totalSmall += item.quantity;
        if (item.product.type === 'LARGE') totalLarge += item.quantity;
    });

    // 3. Recent Orders
    const recentOrders = await prisma.order.findMany({
        where: whereClause,
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
            member: { include: { group: true } },
            round: true
        }
    });

    // 4. Top Groups
    const ordersWithGroup = await prisma.order.findMany({
        where: whereClause,
        include: {
            member: { include: { group: true } }
        }
    });

    const groupStats: Record<string, number> = {};
    ordersWithGroup.forEach((order: any) => {
        const groupName = order.member.group.name;
        if (!groupStats[groupName]) {
            groupStats[groupName] = 0;
        }
        groupStats[groupName] += order.total;
    });

    // Convert to array and sort
    const topGroups = Object.entries(groupStats)
        .map(([name, total]) => ({ name, total }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);

    return {
        totalMembers,
        totalOrders,
        totalRevenue,
        totalSmall,
        totalLarge,
        recentOrders,
        topGroups
    };
}

export async function getAuditLogs(search?: string, date?: string) {
    const where: any = {};

    if (search) {
        where.OR = [
            { action: { contains: search } },
            { details: { contains: search } },
            { ip: { contains: search } }
        ];
    }

    if (date) {
        // Simple date string match (YYYY-MM-DD from input type='date')
        // We'll look for logs created >= date 00:00 and < date+1 00:00
        const startDate = new Date(date);
        const endDate = new Date(date);
        endDate.setDate(endDate.getDate() + 1);

        where.createdAt = {
            gte: startDate,
            lt: endDate
        };
    }

    return await prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 100
    });
}
