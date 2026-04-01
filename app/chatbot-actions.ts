'use server'

import { getCurrentRound, getSummary, getGroups, getProducts, getPaymentMethods, createOrder } from '@/app/actions';
import { uploadSlip, getAiSettings } from '@/app/admin/actions';
import prisma from '@/lib/prisma';
import sharp from 'sharp';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

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

const TYPHOON_API_KEY = process.env.TYPHOON_API_KEY || 'sk-jGBenCBJHPIjkmNlDiLFINpOvgIGxAhw0tCNtfsU2flzfiL0';

// Preprocess image: convert to grayscale + normalize contrast + sharpen for better OCR
async function preprocessImageForOCR(buffer: Buffer): Promise<Buffer> {
    try {
        return await sharp(buffer)
            .grayscale()    // removes colored backgrounds (red/blue themes)
            .normalize()    // stretches contrast automatically
            .sharpen()      // sharpens text edges
            .jpeg({ quality: 95 })
            .toBuffer();
    } catch (e) {
        console.warn('[OCR] Preprocessing failed, using original image:', e);
        return buffer;
    }
}

// Single OCR attempt with a given task_type
// Parameters mirror the official Typhoon OCR playground example exactly
async function tryOCRWithTaskType(imageBuffer: Buffer, taskType: string, mimeType: string = 'image/jpeg', ext: string = 'slip.jpg'): Promise<string | null> {
    const formData = new FormData();
    formData.append('file', new Blob([new Uint8Array(imageBuffer)], { type: mimeType }), ext);
    formData.append('model', 'typhoon-ocr-preview');
    formData.append('task_type', taskType);
    formData.append('max_tokens', '16384');
    formData.append('temperature', '0.1');
    formData.append('top_p', '0.6');
    formData.append('repetition_penalty', '1.2');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    let response;
    try {
        response = await fetch('https://api.opentyphoon.ai/v1/ocr', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${TYPHOON_API_KEY}` },
            body: formData,
            signal: controller.signal
        });
    } catch (error: any) {
        clearTimeout(timeoutId);
        console.error(`[OCR] task_type=${taskType} Network/Timeout Error:`, error.message);
        return null;
    }
    clearTimeout(timeoutId);

    if (!response.ok) {
        console.error(`[OCR] task_type=${taskType} Error (${response.status}):`, await response.text());
        return null;
    }

    const data = await response.json();
    let extractedText = '';
    for (const pageResult of data.results || []) {
        if (pageResult.success && pageResult.message) {
            const content = pageResult.message.choices?.[0]?.message?.content || '';
            try {
                const parsedContent = JSON.parse(content);
                extractedText += (parsedContent.natural_text || content) + '\n';
            } catch {
                extractedText += content + '\n';
            }
        } else if (!pageResult.success) {
            console.error(`[OCR] Page error (${pageResult.filename || 'unknown'}):`, pageResult.error || 'Unknown error');
        }
    }
    return extractedText.trim() || null;
}

export async function extractTextFromSlip(imageBuffer: Buffer, mimeType: string = 'image/jpeg') {
    // Normalize MIME type
    const supportedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const finalMime = supportedTypes.includes(mimeType) ? mimeType : 'image/jpeg';
    const ext = finalMime === 'image/png' ? 'slip.png' : finalMime === 'image/webp' ? 'slip.webp' : 'slip.jpg';

    console.log(`[OCR] Original image: ${imageBuffer.length} bytes, mime=${finalMime}`);

    // Strategy 1: Try original image with task_type=default (same as Playground — best quality)
    console.log('[OCR] Attempt 1: original image, task_type=default');
    const attempt1 = await tryOCRWithTaskType(imageBuffer, 'default', finalMime, ext);
    if (attempt1 && attempt1.length > 30) {
        console.log(`[OCR] ✅ Success (attempt 1): ${attempt1.length} chars`);
        return attempt1;
    }
    console.warn(`[OCR] Attempt 1 returned too little (${attempt1?.length ?? 0} chars), trying fallback...`);

    // Strategy 2: Fallback — preprocess to grayscale + sharpen, then try both task_types
    // (handles very dark/noisy images where color actually hurts OCR)
    console.log('[OCR] Attempt 2: preprocessing image with sharp...');
    const processedBuffer = await preprocessImageForOCR(imageBuffer);
    console.log(`[OCR] Preprocessed: ${processedBuffer.length} bytes`);

    for (const taskType of ['default', 'document']) {
        console.log(`[OCR] Attempt 2 task_type=${taskType}...`);
        const result = await tryOCRWithTaskType(processedBuffer, taskType, 'image/jpeg', 'slip.jpg');
        if (result && result.length > 30) {
            console.log(`[OCR] ✅ Success (fallback task_type=${taskType}): ${result.length} chars`);
            return result;
        }
        console.warn(`[OCR] task_type=${taskType} returned too little (${result?.length ?? 0} chars)`);
    }

    console.error('[OCR] ❌ All attempts failed to extract meaningful text');
    return null;
}

// Shared: post-process parsed slip JSON — verify recipient using configured name/account
function applyRecipientVerification(result: any, recipientName: string, accountSuffix: string, expectedTotal?: number) {
    if (typeof result.amount === 'string') {
        result.amount = parseFloat(result.amount.replace(/,/g, ''));
    }
    if (!result.amount || isNaN(result.amount) || !result.date || !result.time) {
        result.isSlip = false;
    }

    const foundName: string = result.recipientName || '';
    const foundAccount: string = result.recipientAccount || '';

    const nameNorm = foundName.replace(/\s+/g, '');
    const expectedNorm = recipientName.replace(/\s+/g, '');
    // Match first name, last name, or any word from expected name (flexible for OCR/masking)
    const nameParts = expectedNorm.split(/\s+/).filter(Boolean);
    const nameMatch = nameParts.some(part => nameNorm.includes(part)) ||
        // Allow common OCR substitution ฑ→ท
        nameNorm.includes(expectedNorm.replace('ฑ', 'ท'));
    const accountMatch = accountSuffix.length > 0 &&
        foundAccount.replace(/\D/g, '').endsWith(accountSuffix);

    if (!foundName && !foundAccount) {
        result.isCorrectRecipient = null;
    } else {
        result.isCorrectRecipient = nameMatch || accountMatch;
    }

    // ตรวจสอบยอดเงินตรงกับที่สั่งหรือไม่
    if (expectedTotal !== undefined && expectedTotal > 0 && result.amount && !isNaN(result.amount)) {
        result.isCorrectAmount = Math.abs(result.amount - expectedTotal) < 0.01;
        result.expectedTotal = expectedTotal;
    } else {
        result.isCorrectAmount = null;
        result.expectedTotal = expectedTotal ?? null;
    }

    return result;
}

// Analyze slip using Typhoon OCR + Pathumma LLM (original 2-step flow)
async function analyzeSlipTyphoon(imageBuffer: Buffer, mimeType: string, recipientName: string, accountSuffix: string, expectedTotal?: number) {
    const extractedText = await extractTextFromSlip(imageBuffer, mimeType);
    console.log(`[SLIP][Typhoon] OCR result (${extractedText?.length ?? 0} chars):`, extractedText?.substring(0, 300));

    if (!extractedText) {
        console.error('[SLIP][Typhoon] OCR returned empty — aborting');
        return null;
    }

    const promptText = `วิเคราะห์ข้อมูลสลิปโอนเงิน (อ่านจาก OCR Text) อย่างละเอียด\n` +
        `เป้าหมาย: ตรวจสอบและดึงข้อมูลการโอนเงิน\n\n` +
        `ข้อมูลที่อ่านได้จากรูปสลิป:\n"""\n${extractedText}\n"""\n\n` +
        `กฎสำคัญ:\n` +
        `1. "amount" ต้องเป็นตัวเลขเท่านั้น (ห้ามมีเครื่องหมายคอมม่า)\n` +
        `2. "date" หากพบเป็น พ.ศ. ให้แปลงหรือคงไว้ตามนั้น\n` +
        `3. ยึดข้อมูลตามที่ปรากฏใน OCR Text เป็นหลัก ห้ามเดาหรือสร้างข้อมูลขึ้นมาเอง\n` +
        `4. หาชื่อผู้รับเงินโอน (ชื่อบัญชี) และเลขบัญชีผู้รับ ให้เก็บเป็น recipientName และ recipientAccount ท้ายใน JSON\n\n` +
        `รูปแบบ JSON:\n` +
        `{\n` +
        `  "isSlip": boolean,\n` +
        `  "bank": "string",\n` +
        `  "amount": number,\n` +
        `  "date": "string",\n` +
        `  "time": "string",\n` +
        `  "recipientName": "string | null",\n` +
        `  "recipientAccount": "string | null",\n` +
        `  "confidence": number\n` +
        `}\n\n` +
        `ตอบเฉพาะ JSON เท่านั้น ห้ามมีคำอธิบายอื่นๆ`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    let response;
    try {
        response = await fetch(`${API_URL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': API_KEY,
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: '/model',
                messages: [{ role: 'user', content: promptText }],
                max_tokens: 600,
                temperature: 0.1
            }),
            signal: controller.signal
        });
    } catch (error: any) {
        clearTimeout(timeoutId);
        console.error('[SLIP][Typhoon] LLM Network/Timeout Error:', error.message);
        return null;
    }
    clearTimeout(timeoutId);

    if (!response.ok) {
        console.error('[SLIP][Typhoon] LLM API error:', response.status, await response.text());
        return null;
    }
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    const jsonMatch = content.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) return null;

    const result = JSON.parse(jsonMatch[0]);
    return applyRecipientVerification(result, recipientName, accountSuffix, expectedTotal);
}

// Analyze slip using AWS Bedrock Claude Vision (1-step)
async function analyzeSlipBedrock(imageBuffer: Buffer, mimeType: string, region: string, modelId: string, accessKeyId: string, secretAccessKey: string, recipientName: string, accountSuffix: string, expectedTotal?: number) {
    console.log(`[SLIP][Bedrock] Using model=${modelId} region=${region}`);

    const client = new BedrockRuntimeClient({
        region,
        credentials: { accessKeyId, secretAccessKey }
    });

    const supportedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const finalMime = supportedMimes.includes(mimeType) ? mimeType : 'image/jpeg';
    const base64Image = imageBuffer.toString('base64');

    const promptText = `วิเคราะห์สลิปโอนเงินในรูปภาพนี้ ดึงข้อมูลต่อไปนี้ออกมาเป็น JSON\n\n` +
        `กฎสำคัญ:\n` +
        `1. "amount" ต้องเป็นตัวเลขเท่านั้น (ไม่มีคอมม่า)\n` +
        `2. ยึดข้อมูลตามที่เห็นในรูป ห้ามเดา\n` +
        `3. หาชื่อและเลขบัญชีผู้รับเงิน\n\n` +
        `รูปแบบ JSON:\n` +
        `{\n` +
        `  "isSlip": boolean,\n` +
        `  "bank": "string",\n` +
        `  "amount": number,\n` +
        `  "date": "string",\n` +
        `  "time": "string",\n` +
        `  "recipientName": "string | null",\n` +
        `  "recipientAccount": "string | null",\n` +
        `  "confidence": number\n` +
        `}\n\nตอบเฉพาะ JSON เท่านั้น`;

    const payload = {
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 600,
        temperature: 0.1,
        messages: [{
            role: 'user',
            content: [
                {
                    type: 'image',
                    source: { type: 'base64', media_type: finalMime, data: base64Image }
                },
                { type: 'text', text: promptText }
            ]
        }]
    };

    try {
        const command = new InvokeModelCommand({
            modelId,
            body: JSON.stringify(payload),
            contentType: 'application/json',
            accept: 'application/json',
        });
        const response = await client.send(command);
        const body = JSON.parse(new TextDecoder().decode(response.body));
        const content = body.content?.[0]?.text || '';
        console.log('[SLIP][Bedrock] raw response:', content.substring(0, 500));

        const jsonMatch = content.match(/\{[\s\S]*?\}/);
        if (!jsonMatch) return null;

        const result = JSON.parse(jsonMatch[0]);
        return applyRecipientVerification(result, recipientName, accountSuffix, expectedTotal);
    } catch (error: any) {
        console.error('[SLIP][Bedrock] Error:', error.message);
        return null;
    }
}

// Analyze slip — routes to Typhoon or Bedrock based on admin config
export async function analyzeSlip(imageBuffer: Buffer, expectedTotal: number, mimeType: string = 'image/jpeg') {
    try {
        const config = await getAiSettings();
        console.log(`[SLIP] Provider: ${config.aiProvider}`);

        if (config.aiProvider === 'bedrock') {
            return await analyzeSlipBedrock(
                imageBuffer, mimeType,
                config.bedrockRegion, config.bedrockModelId,
                config.bedrockAccessKeyId, config.bedrockSecretAccessKey,
                config.recipientName, config.recipientAccountSuffix,
                expectedTotal
            );
        }

        return await analyzeSlipTyphoon(imageBuffer, mimeType, config.recipientName, config.recipientAccountSuffix, expectedTotal);
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
        const mimeType = file.type || 'image/jpeg'; // preserve actual file MIME type

        // Debug: log file info to diagnose OCR issues
        console.log(`[VERIFY] File received: name="${file.name}", type="${file.type}", size=${file.size} bytes, buffer=${buffer.length} bytes`);

        // 1. Upload for preview/storage
        const slipUrl = await uploadSlip(formData);
        if (!slipUrl) return { success: false, error: 'อัพโหลดสลิปไม่สำเร็จ' };

        // 2. AI Analysis (pass real MIME type to OCR)
        const analysis = await analyzeSlip(buffer, expectedTotal, mimeType);

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
        if (!forcedStatus && totalPaid >= orderData.total) { // Extra safe check (equal or overpaid)
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
