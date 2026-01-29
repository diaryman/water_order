'use server'

import { PrismaClient } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { CreateOrderSchema } from '@/lib/schemas';

const prisma = new PrismaClient()

export async function getGroups() {
    return await prisma.group.findMany({
        include: { members: true }
    })
}

export async function getMembers(groupId: number) {
    return await prisma.member.findMany({
        where: { groupId }
    })
}

export async function getProducts() {
    return await prisma.product.findMany({
        where: { isAvailable: true }
    })
}

export async function getPaymentMethods() {
    return await prisma.paymentMethod.findMany({
        where: { isActive: true }
    })
}


export async function getRounds() {
    return await prisma.orderRound.findMany({
        orderBy: { createdAt: 'desc' }
    })
}

export async function createRound(name: string) {
    // Optional: de-activate other rounds if we want only one active at a time
    // For now, just create
    const round = await prisma.orderRound.create({
        data: {
            roundName: name,
            isActive: true, // Make it the active round by default?
            isAcceptingOrders: false, // Start closed
            startDate: new Date()
        }
    })
    revalidatePath('/admin/rounds')
    return round
}

export async function toggleRoundStatus(id: number, isAcceptingOrders: boolean) {
    const round = await prisma.orderRound.update({
        where: { id },
        data: { isAcceptingOrders }
    })
    revalidatePath('/admin/rounds')
    revalidatePath('/') // affects homepage
    return round
}

export async function getCurrentRound() {
    // Assuming "Active" means the one relevant for display
    // We could find the latest one
    return await prisma.orderRound.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' }
    })
}

export async function createOrder(data: {
    memberId: number,
    items: { productId: number, quantity: number, price: number }[],
    total: number,
    slipUrl?: string
}) {
    // Validate Input
    const validation = CreateOrderSchema.safeParse(data);
    if (!validation.success) {
        throw new Error(validation.error.issues[0].message);
    }

    const activeRound = await getCurrentRound()

    if (!activeRound || !activeRound.isAcceptingOrders) {
        throw new Error("ขณะนี้ปิดรับออเดอร์แล้ว")
    }

    const order = await prisma.order.create({
        data: {
            memberId: data.memberId,
            roundId: activeRound.id,
            total: data.total,
            status: 'PENDING',
            slipUrl: data.slipUrl,
            items: {
                create: data.items.map(item => ({
                    productId: item.productId,
                    quantity: item.quantity,
                    price: item.price
                }))
            }
        }
    })
    revalidatePath('/') // Update homepage summary
    return order
}

export async function getTodaySummary() {
    // Only show summary for current round? 
    // Or keep logic as "Today"? 
    // User request: "support rounds". 
    // Let's modify summary to be "Current Round Summary" if a round exists, or falback to today?
    // Actually, asking to "add round" implies we should focus on rounds.
    // Let's keep existing "today" logic for now unless requested to change stats, 
    // BUT usually round summary is more useful.
    // For now I will leave getTodaySummary as is (by date) and maybe add getRoundSummary later if needed,
    // to verify minimal changes first.
    // Wait, the replaced content must match target. I will modify createOrder and ADD the new functions before it.
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const orders = await prisma.order.findMany({
        where: {
            createdAt: {
                gte: today
            }
        },
        include: {
            member: {
                include: { group: true }
            },
            items: {
                include: { product: true }
            }
        },
        orderBy: { createdAt: 'desc' }
    })

    // Calculate stats
    let totalSmall = 0
    let totalLarge = 0
    let totalPrice = 0

    orders.forEach(order => {
        totalPrice += order.total
        order.items.forEach(item => {
            if (item.product.type === 'SMALL') totalSmall += item.quantity
            if (item.product.type === 'LARGE') totalLarge += item.quantity
        })
    })

    return { orders, totalSmall, totalLarge, totalPrice }
}

export async function getMemberOrders(memberId: number) {
    return await prisma.order.findMany({
        where: { memberId },
        include: {
            items: {
                include: { product: true }
            },
            round: true
        },
        orderBy: { createdAt: 'desc' },
        take: 20 // Limit to last 20 orders
    })
}
