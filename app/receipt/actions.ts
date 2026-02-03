'use server'

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function getOrder(orderId: number) {
    const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
            member: {
                include: { group: true }
            },
            items: {
                include: { product: true }
            },
            round: true
        }
    })

    return order
}
