'use server'

import { getCurrentRound, getSummary, getGroups, getProducts, getPaymentMethods, createOrder } from '@/app/actions';
import { uploadSlip } from '@/app/admin/actions';
import prisma from '@/lib/prisma';

const API_URL = process.env.OPENAI_BASE_URL || 'http://thaillm.or.th/api/pathumma/v1';
const API_KEY = process.env.OPENAI_API_KEY || '';

// ========== Data fetching helpers ==========

export async function getChatbotData() {
    const groups = await getGroups();
    const products = await getProducts();
    const payments = await getPaymentMethods();
    const round = await getCurrentRound();

    return {
        groups: groups.map(g => ({
            id: g.id,
            name: g.name,
            members: g.members.map(m => ({ id: m.id, name: m.name }))
        })),
        products: products.map(p => ({
            id: p.id,
            name: p.name,
            price: p.price,
            type: p.type
        })),
        payments: payments.map(p => ({
            id: p.id,
            bankName: p.bankName,
            accountName: p.accountName,
            accountNumber: p.accountNumber,
            qrCodeUrl: p.qrCodeUrl
        })),
        isAcceptingOrders: round?.isAcceptingOrders || false,
        roundName: round?.roundName || null,
    };
}

// Analyze slip with Vision
export async function analyzeSlip(imageBuffer: Buffer, expectedTotal: number) {
    try {
        const base64Image = imageBuffer.toString('base64');
        const response = await fetch(`${API_URL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': API_KEY,
            },
            body: JSON.stringify({
                model: '/model',
                messages: [
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: `วิเคราะห์สลิปธนาคารไทยอย่างละเอียด\n` +
                                    `เป้าหมาย: ตรวจสอบและดึงข้อมูลการโอนเงิน\n\n` +
                                    `กฎสำคัญ:\n` +
                                    `1. "amount" ต้องเป็นตัวเลขเท่านั้น (ห้ามมีเครื่องหมายคอมม่า)\n` +
                                    `2. "date" หากปีเป็น พ.ศ. (เช่น 2568, 2569) ให้คงไว้ตามนั้น\n` +
                                    `3. ยอดเงินที่คาดหวังคือ ${expectedTotal} บาท (ใช้เพื่อช่วยตรวจสอบ แต่ให้ยึดตามที่เห็นในสลิปจริง)\n` +
                                    `4. ตรวจสอบ "จำนวนเงิน" หรือ "ยอดโอน" ให้ดี (มักจะอยู่บรรทัดล่างๆ)\n\n` +
                                    `รูปแบบ JSON:\n` +
                                    `{\n` +
                                    `  "isSlip": boolean,\n` +
                                    `  "bank": "string", // ชื่อธนาคารภาษาไทยหรืออังกฤษ\n` +
                                    `  "amount": number,\n` +
                                    `  "date": "string", // DD/MM/YYYY\n` +
                                    `  "time": "string", // HH:mm\n` +
                                    `  "confidence": number\n` +
                                    `}\n\n` +
                                    `ตอบเฉพาะ JSON เท่านั้น ห้ามมีคำอธิบาย`
                            },
                            {
                                type: 'image_url',
                                image_url: {
                                    url: `data:image/jpeg;base64,${base64Image}`
                                }
                            }
                        ]
                    }
                ],
                max_tokens: 500,
            }),
        });

        if (!response.ok) return null;
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '';
        const jsonMatch = content.match(/\{[\s\S]*?\}/);
        if (jsonMatch) {
            let result = JSON.parse(jsonMatch[0]);

            // Post-processing to ensure amount is a number and clean
            if (typeof result.amount === 'string') {
                result.amount = parseFloat(result.amount.replace(/,/g, ''));
            }

            // Strict check: must have amount and date/time to be valid
            if (!result.amount || isNaN(result.amount) || !result.date || !result.time) {
                result.isSlip = false;
            }
            return result;
        }
        return null;
    } catch (error) {
        console.error('Slip Analysis Error:', error);
        return null;
    }
}

// Verify slip only (without creating order)
export async function chatbotVerifySlip(formData: FormData, expectedTotal: number) {
    try {
        const file = formData.get('file') as File;
        if (!file) return { success: false, error: 'ไม่พบไฟล์สลิป' };

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // 1. Upload for preview/storage
        const slipUrl = await uploadSlip(formData);
        if (!slipUrl) return { success: false, error: 'อัพโหลดสลิปไม่สำเร็จ' };

        // 2. AI Analysis
        const analysis = await analyzeSlip(buffer, expectedTotal);

        if (!analysis || !analysis.isSlip) {
            return {
                success: false,
                analysis,
                error: 'เอกสารนี้ดูเหมือนไม่ใช่สลิปการโอนเงินที่สมบูรณ์ (ไม่พบยอดเงิน หรือวันเวลาที่โอน) กรุณาตรวจสอบและส่งใหม่อีกครั้งนะคะ 🙏'
            };
        }

        return {
            success: true,
            slipUrl,
            analysis
        };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

// Upload slip and create order (supports single or multi-slip logic)
export async function chatbotUploadSlipAndCreateOrder(
    slips: Array<{ url: string, amount: number, bank: string, date: string, time: string }>,
    orderData: {
        memberId: number,
        items: { productId: number, quantity: number, price: number }[],
        total: number
    },
    forcedStatus?: string
) {
    try {
        const totalPaid = slips.reduce((sum, s) => sum + s.amount, 0);
        const slipUrls = slips.map(s => s.url).join(',');

        let status = forcedStatus || 'PENDING';
        if (!forcedStatus && Math.abs(totalPaid - orderData.total) < 0.01) {
            status = 'PAID';
        }

        const order = await createOrder({
            memberId: orderData.memberId,
            items: orderData.items,
            total: orderData.total,
            slipUrl: slipUrls,
            status: status,
            slips: slips
        });

        return {
            success: true,
            orderId: order.id,
            totalPaid,
            isAutoConfirmed: status === 'PAID'
        };
    } catch (error: any) {
        console.error('Chatbot order creation error:', error);
        return { success: false, error: error.message || 'เกิดข้อผิดพลาดในการสร้างออเดอร์' };
    }
}

// ========== AI Chat ==========

export async function askNongNam(message: string, conversationHistory: { role: string, content: string }[]) {
    try {
        const round = await getCurrentRound();
        const summary = await getSummary(round?.id);

        const paidOrdersCount = summary.orders.filter(o => o.status === 'PAID').length;
        const pendingOrdersCount = summary.orders.filter(o => o.status === 'PENDING').length;
        const totalUnpaid = summary.orders.filter(o => o.status === 'PENDING').reduce((acc, o) => acc + o.total, 0);
        const totalPaid = summary.orders.filter(o => o.status === 'PAID').reduce((acc, o) => acc + o.total, 0);

        // Fetch ALL orders for all-time stats
        const allOrders = await prisma.order.findMany({
            include: {
                member: {
                    include: { group: true }
                },
                items: {
                    include: { product: true }
                }
            }
        });

        // --- Aggregation for Deep Summary (All-Time) ---
        const groupSales: Record<string, { total: number, count: number }> = {};
        const memberSales: Record<string, { total: number, name: string, group: string }> = {};
        let totalAllTimeUnpaid = 0;
        let totalAllTimePaid = 0;

        allOrders.forEach(o => {
            const groupName = o.member?.group?.name || 'ไม่ระบุกลุ่ม';
            const memberName = o.member?.name || 'ไม่ระบุชื่อ';

            if (!groupSales[groupName]) groupSales[groupName] = { total: 0, count: 0 };
            groupSales[groupName].total += o.total;
            groupSales[groupName].count += 1;

            if (!memberSales[memberName]) memberSales[memberName] = { total: 0, name: memberName, group: groupName };
            memberSales[memberName].total += o.total;

            if (o.status === 'PENDING') totalAllTimeUnpaid += o.total;
            if (o.status === 'PAID') totalAllTimePaid += o.total;
        });

        const sortedMembers = Object.values(memberSales).sort((a, b) => b.total - a.total);
        const sortedGroups = Object.entries(groupSales)
            .map(([k, v]) => ({ name: k, total: v.total, count: v.count }))
            .sort((a, b) => b.total - a.total);

        const allMembersText = sortedMembers.length > 0
            ? sortedMembers.map((m, i) => `  ${i + 1}. ${m.name} (${m.group}): ${m.total} บาท`).join('\n')
            : '  (ยังไม่มีข้อมูล)';

        const allGroupsText = sortedGroups.length > 0
            ? sortedGroups.map((g, i) => `  ${i + 1}. ${g.name}: ${g.count} ออเดอร์, ยอดเงิน ${g.total} บาท`).join('\n')
            : '  (ยังไม่มีข้อมูล)';

        const products = await getProducts();
        const groups = await getGroups();
        const payments = await getPaymentMethods();

        const productList = products.map(p => `- ${p.name} (ID:${p.id}) ราคา ${p.price} บาท/แพ็ค (ประเภท: ${p.type})`).join('\n');
        const groupList = groups.map(g => `- ${g.name} (ID:${g.id}): สมาชิก ${g.members.map(m => `${m.name}(ID:${m.id})`).join(', ')}`).join('\n');
        const paymentInfo = payments.map(p => `- ${p.bankName}: ${p.accountName} เลขบัญชี ${p.accountNumber}${p.qrCodeUrl ? ` [QR:${p.qrCodeUrl}]` : ''}`).join('\n');

        const systemPrompt = `คุณคือ "น้องน้ำ" ผู้ช่วยอัจฉริยะประจำระบบสั่งน้ำดื่ม สวัสดิการสำนักวิทยาการสารสนเทศ สำนักงานศาลปกครอง

คุณมีความสามารถ 2 อย่างเท่านั้น:
1. ตอบคำถามที่เกี่ยวข้องกับ "ระบบสั่งน้ำดื่ม" ของสำนักวิทยาการสารสนเทศเท่านั้น (เช่น วิธีการสั่ง, สถานะออเดอร์, ยอดเงิน, สินค้าที่มี, วิธีจ่ายเงิน, สรุปสถิติการสั่งน้ำ)
2. ช่วยทำรายการสั่งน้ำดื่ม

⚠️ กฎข้อห้ามเด็ดขาด (Strict Rules):
- ห้ามตอบคำถามทั่วไปที่ไม่เกี่ยวกับระบบสั่งน้ำดื่มเด็ดขาด
- หากผู้ใช้ถามเรื่องคดีปกครอง, ศาลปกครอง, ขั้นตอนการฟ้องคดี, หรือบริการอื่นๆ ของศาล ให้ปฏิเสธอย่างสุภาพและตอบว่า: "ขออภัยค่ะ น้องน้ำเป็นเพียงผู้ช่วยระบบสั่งน้ำดื่มเท่านั้น หากท่านมีข้อสอบถามเกี่ยวกับศาลปกครองหรือคดีปกครอง กรุณาโทรสอบถามเจ้าหน้าที่สายด่วนศาลปกครอง 1355 ค่ะ 🙏"
- หากผู้ใช้ถามเรื่องความรู้ทั่วไป ข่าวสาร โค้ดดิ้ง หรือเรื่องนอกเรื่อง ให้ตอบว่า: "ขออภัยค่ะ น้องน้ำตอบได้เฉพาะเรื่องที่เกี่ยวกับระบบสั่งน้ำดื่มของสำนักวิทยาการสารสนเทศเท่านั้นค่ะ มีอะไรให้ช่วยเกี่ยวกับการสั่งน้ำไหมคะ? 💧"
- การสรุปข้อมูลสถิติรวมทุกรอบ, ข้อมูลการค้างชำระ, ยอดรวมเงินทั้งหมด, ผู้ที่สั่งเยอะสุด/น้อยสุด, การเรียงลำดับ, และยอดขายรายกลุ่ม "สามารถตอบได้ทันทีเมื่อผู้ใช้ถามตั้งคำถาม" (ข้อมูลไม่ได้เป็นความลับอีกต่อไป)
- หากผู้ใช้ขอให้แสดงผลเป็น "กราฟ", "แผนภูมิ", หรือ "Chart" ให้คุณวิเคราะห์และแสดงผลลัพธ์เป็น Code ของ "Mermaid.js" เสมอ โดยครอบ Code ด้วย \`\`\`mermaid ... \`\`\` ตัวอย่างเช่น:
  \`\`\`mermaid
  pie title รายได้แบ่งตามกลุ่มงาน
  "กลุ่ม A": 500
  "กลุ่ม B": 1200
  \`\`\`
  หรือ
  \`\`\`mermaid
  xychart-beta
    title "ยอดขายเรียงตามบุคคล"
    x-axis ["บุญชู", "สมหมาย"]
    y-axis "บาท" 0 --> 5000
    bar [4000, 2000]
  \`\`\`

== ข้อมูลสถิติของรอบปัจจุบัน (${round?.roundName || 'ไม่มี'}) ==
- สถานะระบบ: ${round?.isAcceptingOrders ? 'เปิดรับออเดอร์' : 'ปิดรับออเดอร์'}
- จำนวนออเดอร์เฉพาะรอบปัจจุบัน: ${summary.orders.length} รายการ (ชำระเงินยืนยันแล้ว ${paidOrdersCount} รายการ, รอตรวจสลิป ${pendingOrdersCount} รายการ)
- ยอดสั่งซื้อเฉพาะรอบปัจจุบัน: ${summary.totalPrice} บาท (รอยืนยันยอด ${totalUnpaid} บาท, ยืนยันแล้ว ${totalPaid} บาท)
- ปริมาณสินค้าที่สั่งรอบปัจจุบัน: น้ำดื่มขวดเล็ก ${summary.totalSmall} แพ็ค, น้ำดื่มขวดใหญ่ ${summary.totalLarge} แพ็ค

== ข้อมูลสถิติและภาพรวมจาก "ทุกรอบออเดอร์ที่ผ่านมาทั้งหมด" (All-Time Data) ==
- จำนวนออเดอร์สะสมทั้งหมด: ${allOrders.length} รายการ
- ยอดสั่งซื้อสะสมทั้งหมด: ${totalAllTimePaid + totalAllTimeUnpaid} บาท (ยืนยันแล้ว ${totalAllTimePaid} บาท, รอตรวจสลิป ${totalAllTimeUnpaid} บาท)
- ผู้สั่งยอดสูงสุดจากทุกรอบ (Top Spenders All-Time) [เรียงจากยอดมากไปน้อย]:
${allMembersText}
- สรุปยอดสั่งซื้อแบ่งตามกลุ่มงานจากทุกรอบ (Sales by Group All-Time) [เรียงจากยอดมากไปน้อย]:
${allGroupsText}
หากผู้ใช้ถามสถิติทั่วไป เช่น สรุปยอด, ใครสั่งเยอะสุด, กลุ่มไหนสั่งเยอะสุด, จัดอันดับ ฯลฯ ให้ใช้ข้อมูล "จากทุกรอบออเดอร์ที่ผ่านมาทั้งหมด" เพื่อมาตอบเป็นค่าเริ่มต้นเสมอ (ยกเว้นผู้ใช้จะระบุว่าเอาเฉพาะรอบปัจจุบัน) และสามารถนำไปกลับลำดับได้เองเมื่อผู้ใช้ร้องขอ

== สินค้า ==
${productList}

== กลุ่มงานและสมาชิก ==
${groupList}

== ช่องทางชำระเงิน ==
${paymentInfo}

== กฎการสั่งน้ำผ่านแชท ==
เมื่อผู้ใช้ต้องการสั่งน้ำ ให้ถามข้อมูลทีละขั้นตอน:
1. ถามชื่อผู้สั่ง(ค้นหาจากรายชื่อสมาชิก)
2. ถามจำนวนที่ต้องการสั่ง(น้ำเล็กกี่แพ็ค น้ำใหญ่กี่แพ็ค)
3. เมื่อได้ข้อมูลครบ ให้สรุปรายการและถามยืนยัน
4. เมื่อผู้ใช้ยืนยัน ให้แสดง QR Code สำหรับชำระเงิน และขอให้ผู้ใช้ส่งสลิปการโอนเงิน(ออเดอร์จะถูกสร้างหลังจากส่งสลิปแล้วเท่านั้น)

เมื่อผู้ใช้ยืนยันออเดอร์(ยังไม่ต้องสร้าง order จริง ให้รอสลิปก่อน) ให้ตอบด้วย JSON นี้:
[ORDER_PENDING]{ "memberId": ID, "items": [{ "productId": ID, "quantity": จำนวน, "price": ราคา }], "total": ยอดรวม, "memberName": "ชื่อสมาชิก" }[/ORDER_PENDING]

ตามด้วยข้อความบอกให้ผู้ใช้โอนเงินและส่งสลิป

ห้ามส่ง ORDER_PENDING ถ้ายังไม่ครบข้อมูลหรือผู้ใช้ยังไม่ยืนยัน
ตอบสั้นๆ กระชับ เป็นกันเอง น่ารัก`;

        const messages = [
            { role: 'system', content: systemPrompt },
            ...conversationHistory.slice(-10),
            { role: 'user', content: message },
        ];

        const response = await fetch(`${API_URL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': API_KEY,
            },
            body: JSON.stringify({
                model: '/model',
                messages,
                max_tokens: 2000,
                temperature: 0.3,
            }),
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        let content = data.choices?.[0]?.message?.content || 'ขอโทษนะคะ น้องน้ำไม่เข้าใจ';

        // Remove <think>...</think> blocks
        content = content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

        // Check for order pending (waiting for slip)
        const orderMatch = content.match(/\[ORDER_PENDING\]([\s\S]*?)\[\/ORDER_PENDING\]/);
        if (orderMatch) {
            try {
                const orderData = JSON.parse(orderMatch[1]);

                // Get payment info
                const qrUrl = payments.find(p => p.qrCodeUrl)?.qrCodeUrl || null;
                const paymentText = payments.map(p =>
                    `💳 ${p.bankName}\nชื่อบัญชี: ${p.accountName}\nเลขบัญชี: ${p.accountNumber}`
                ).join('\n\n');

                // Clean the content (remove the JSON tag)
                const cleanContent = content.replace(/\[ORDER_PENDING\][\s\S]*?\[\/ORDER_PENDING\]/, '').trim();

                return {
                    type: 'order_pending' as const,
                    message: `📋 สรุปรายการสั่งซื้อ\n👤 ผู้สั่ง: ${orderData.memberName}\n${orderData.items.map((item: any) => {
                        const product = products.find(p => p.id === item.productId);
                        return `📦 ${product?.name || 'สินค้า'} x${item.quantity} = ${item.price * item.quantity} บาท`;
                    }).join('\n')
                        }\n💰 รวม: ${orderData.total} บาท\n\n${paymentText}\n\n🔽 แสกน QR Code ด้านล่าง แล้ว "ส่งรูปสลิป" ให้น้องน้ำค่ะ\nออเดอร์จะถูกบันทึกหลังจากส่งสลิปแล้วเท่านั้น ✨`,
                    qrCodeUrl: qrUrl,
                    orderData: orderData,
                };
            } catch (e) {
                console.error('Order parse error:', e);
                return {
                    type: 'text' as const,
                    message: 'ขออภัยค่ะ เกิดข้อผิดพลาดในการประมวลผลรายการ กรุณาลองใหม่อีกครั้งนะคะ 🙏',
                };
            }
        }

        return {
            type: 'text' as const,
            message: content,
        };
    } catch (error) {
        console.error('NongNam Error:', error);
        return {
            type: 'text' as const,
            message: 'ขออภัยค่ะ น้องน้ำขัดข้องนิดหน่อย ลองใหม่อีกครั้งนะคะ 🙏',
        };
    }
}
