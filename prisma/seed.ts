import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
    // Create Groups
    const group1 = await prisma.group.upsert({
        where: { id: 1 },
        update: {},
        create: { name: 'สำนักบริหารกลาง' },
    })
    const group2 = await prisma.group.upsert({
        where: { id: 2 },
        update: {},
        create: { name: 'สำนักเทคโนโลยีสารสนเทศ' },
    })

    // Create Members
    await prisma.member.createMany({
        data: [
            { name: 'สมชาย รักชาติ', groupId: group1.id },
            { name: 'สมหญิง จริงใจ', groupId: group1.id },
            { name: 'แอดมิน ทดสอบ', groupId: group2.id },
        ],
    })

    // Create Products
    await prisma.product.createMany({
        data: [
            { name: 'น้ำดื่ม (แพ็คเล็ก)', price: 48, type: 'SMALL' },
            { name: 'น้ำดื่ม (แพ็คใหญ่)', price: 48, type: 'LARGE' },
        ],
    })

    // Create Payment Method
    await prisma.paymentMethod.create({
        data: {
            bankName: 'ธนาคารกรุงไทย',
            accountName: 'สวัสดิการสำนักงานศาลฯ',
            accountNumber: '123-4-56789-0'
        },
    })
}
main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
