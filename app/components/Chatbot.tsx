'use client'

import { useState, useRef, useEffect } from 'react'
import { askNongNam, chatbotUploadSlipAndCreateOrder, getChatbotData } from '@/app/chatbot-actions'
import { uploadFile } from '@/app/admin/actions'
import mermaid from 'mermaid'

type OrderData = {
    memberId: number
    memberName: string
    groupName: string
    items: { productId: number, quantity: number, price: number, name: string }[]
    total: number
}

type ChatMessage = {
    role: 'user' | 'bot'
    content: string
    qrCodeUrl?: string | null
    orderId?: number
    total?: number
    type?: 'text' | 'order_pending' | 'order_success' | 'slip_preview' | 'excess_confirm'
    imageUrl?: string
}

type Group = { id: number; name: string; members: { id: number; name: string }[] }
type Product = { id: number; name: string; price: number; type: string }
type Payment = { id: number; bankName: string; accountName: string; accountNumber: string; qrCodeUrl: string | null }

type OrderStep = 'idle' | 'select_group' | 'select_member' | 'select_products' | 'confirm' | 'waiting_slip'

mermaid.initialize({ startOnLoad: false, theme: 'default' })

export default function Chatbot() {
    const [isOpen, setIsOpen] = useState(false)
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            role: 'bot',
            content: 'สวัสดีค่ะ! 💧 น้องน้ำยินดีให้บริการค่ะ\n\nน้องน้ำช่วยได้ทั้ง:\n• ตอบคำถามเกี่ยวกับระบบ\n• 🛒 สั่งน้ำดื่มให้เลย!\n\nมีอะไรให้ช่วยไหมคะ?',
            type: 'text'
        }
    ])
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [isHovered, setIsHovered] = useState(false)
    const [showQr, setShowQr] = useState<string | null>(null)

    // Order wizard state
    const [orderStep, setOrderStep] = useState<OrderStep>('idle')
    const [groups, setGroups] = useState<Group[]>([])
    const [products, setProducts] = useState<Product[]>([])
    const [payments, setPayments] = useState<Payment[]>([])
    const [isAcceptingOrders, setIsAcceptingOrders] = useState(false)
    const [selectedGroup, setSelectedGroup] = useState<Group | null>(null)
    const [selectedMember, setSelectedMember] = useState<{ id: number; name: string } | null>(null)
    const [cart, setCart] = useState<Record<number, number>>({})
    const [pendingOrder, setPendingOrder] = useState<OrderData | null>(null)
    const [uploadedSlips, setUploadedSlips] = useState<{ url: string; amount: number; bank: string; date: string; time: string }[]>([])

    // UI enhancements state
    const [memberSearchTerm, setMemberSearchTerm] = useState('')

    const scrollRef = useRef<HTMLDivElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
        try {
            mermaid.run({ querySelector: '.mermaid' })
        } catch (e) {
            console.error('Mermaid render error:', e)
        }
    }, [messages, orderStep, memberSearchTerm])

    useEffect(() => {
        if (isOpen && groups.length === 0) {
            getChatbotData().then(data => {
                setGroups(data.groups)
                setProducts(data.products)
                setPayments(data.payments)
                setIsAcceptingOrders(data.isAcceptingOrders)
            })
        }
    }, [isOpen])

    const addBotMessage = (content: string, extra?: Partial<ChatMessage>) => {
        setMessages(prev => [...prev, { role: 'bot', content, type: 'text', ...extra }])
    }

    const addUserMessage = (content: string) => {
        setMessages(prev => [...prev, { role: 'user', content, type: 'text' }])
    }

    // ============ Order Wizard Handlers ============

    const startOrder = () => {
        if (!isAcceptingOrders) {
            addBotMessage('🚨 ขออภัยค่ะ ขณะนี้ระบบปิดรับออเดอร์ชั่วคราว กรุณารอรอบถัดไปนะคะ 🙏')
            return
        }
        addUserMessage('🛒 อยากสั่งน้ำ')
        setOrderStep('select_group')
        setSelectedGroup(null)
        setSelectedMember(null)
        setCart({})
        setPendingOrder(null)
        setUploadedSlips([])
        setMemberSearchTerm('')
    }

    const selectGroup = (group: Group) => {
        setSelectedGroup(group)
        addUserMessage(`🏢 ${group.name}`)
        setMemberSearchTerm('')
        setOrderStep('select_member')
    }

    const selectMember = (member: { id: number; name: string }) => {
        setSelectedMember(member)
        addUserMessage(`👤 ${member.name}`)
        setCart({})
        setOrderStep('select_products')
    }

    const updateCart = (productId: number, delta: number) => {
        setCart(prev => {
            const current = prev[productId] || 0
            const next = Math.max(0, current + delta)
            return { ...prev, [productId]: next }
        })
    }

    const confirmProducts = () => {
        const totalItems = Object.values(cart).reduce((a, b) => a + b, 0)
        if (totalItems === 0) return

        const items = Object.entries(cart)
            .filter(([_, qty]) => qty > 0)
            .map(([pId, qty]) => {
                const product = products.find(p => p.id === Number(pId))!
                return { productId: product.id, quantity: qty, price: product.price, name: product.name }
            })

        const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
        const itemsSummary = items.map(i => `📦 ${i.name} x${i.quantity} = ${i.price * i.quantity} บาท`).join('\n')
        addUserMessage(`ยืนยันการเลือกสินค้า:\n${itemsSummary}`)

        const orderData: OrderData = {
            memberId: selectedMember!.id,
            memberName: selectedMember!.name,
            groupName: selectedGroup!.name,
            items,
            total,
        }
        setPendingOrder(orderData)
        setOrderStep('confirm')
    }

    const confirmOrder = () => {
        if (!pendingOrder) return
        addUserMessage('✅ ยืนยันออเดอร์นี้')

        const payment = payments[0]
        const paymentText = payments.map(p =>
            `💳 ${p.bankName}\nชื่อบัญชี: ${p.accountName}\nเลขบัญชี: ${p.accountNumber}`
        ).join('\n\n')

        addBotMessage(
            `ยอดชำระทั้งหมด ${pendingOrder.total} บาท\n\n${paymentText}\n\n🔽 แสกน QR Code ด้านล่าง แล้ว "ส่งรูปสลิป"\n\n⚠️ ออเดอร์จะเข้าระบบหลังจากแนบสลิปเท่านั้นนะคะ`,
            {
                type: 'order_pending',
                qrCodeUrl: payment?.qrCodeUrl || null,
            }
        )
        setOrderStep('waiting_slip')
    }

    const cancelOrder = () => {
        addUserMessage('❌ ยกเลิก')
        addBotMessage('ยกเลิกรายการสั่งน้ำเรียบร้อยแล้วค่ะ มีอะไรให้ช่วยอีกบอกน้องน้ำได้เสมอนะคะ 😊')
        setOrderStep('idle')
        setPendingOrder(null)
        setUploadedSlips([])
        setSelectedGroup(null)
        setSelectedMember(null)
        setCart({})
    }

    // ============ Final Order Creation ============

    const createFinalOrder = async (slipsToUse: any[], forcedStatus?: string) => {
        if (!pendingOrder) return
        setIsLoading(true)
        try {
            const result = await chatbotUploadSlipAndCreateOrder(
                slipsToUse,
                {
                    memberId: pendingOrder.memberId,
                    items: pendingOrder.items.map(i => ({ productId: i.productId, quantity: i.quantity, price: i.price })),
                    total: pendingOrder.total,
                },
                forcedStatus
            )

            if (result.success) {
                setMessages(prev => [...prev, {
                    role: 'bot',
                    content: `🎉 สั่งซื้อสำเร็จเรียบร้อยค่ะ!\n\n📦 ออเดอร์ #${result.orderId}\n👤 ผู้สั่ง: ${pendingOrder.memberName}\n💰 ยอดเงินรวมในสลิป: ${result.totalPaid} บาท (ออเดอร์ ${pendingOrder.total} บาท)\n\n${result.isAutoConfirmed
                        ? `✅ **น้องน้ำตรวจสอบสลิปแล้ว ยอดเงินครบถ้วน!** ยืนยันชำระเงินให้ทันทีค่ะ ⚡`
                        : `⏳ น้องน้ำได้รับสลิปแล้วนะคะ ซึ่งยอดเงินอาจจะมากกว่ายอดสั่งซื้อ แอดมินจะตรวจสอบให้อีกครั้งค่ะ`
                        }\n\nขอบคุณที่ใช้บริการน้องน้ำนะคะ ✨`,
                    type: 'order_success',
                    orderId: result.orderId,
                    total: pendingOrder.total,
                }])
                setOrderStep('idle')
                setPendingOrder(null)
                setUploadedSlips([])
                setSelectedGroup(null)
                setSelectedMember(null)
                setCart({})
            } else {
                addBotMessage(`❌ ไม่สามารถสร้างออเดอร์ได้ค่ะ: ${result.error}`)
            }
        } catch (e: any) {
            addBotMessage(`❌ เกิดข้อผิดพลาด: ${e.message}`)
        } finally {
            setIsLoading(false)
        }
    }

    const handleSlipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file || !pendingOrder) return

        if (!file.type.startsWith('image/')) {
            addBotMessage('❌ กรุณาส่งที่รูปภาพที่เป็นสลิปการโอนเงินเท่านั้นนะคะ')
            return
        }
        if (file.size > 5 * 1024 * 1024) {
            addBotMessage('❌ ไฟล์มีขนาดใหญ่เกินไปค่ะ สูงสุด 5MB')
            return
        }

        const previewUrl = URL.createObjectURL(file)
        setMessages(prev => [...prev, {
            role: 'user', content: `📎 ส่งสลิปแนบออเดอร์`, type: 'slip_preview', imageUrl: previewUrl,
        }])

        setIsLoading(true)
        addBotMessage('⏳ น้องน้ำกำลังรับสลิปให้อยู่นะคะ...')

        try {
            const formData = new FormData()
            formData.append('file', file)

            const slipUrl = await uploadFile(formData)

            setMessages(prev => prev.slice(0, -1))

            if (!slipUrl) {
                addBotMessage('❌ อัพโหลดสลิปไม่สำเร็จค่ะ กรุณาลองใหม่อีกครั้งนะคะ')
                return
            }

            const newSlip = {
                url: slipUrl,
                amount: pendingOrder.total,
                bank: '',
                date: '',
                time: ''
            }

            const newSlips = [...uploadedSlips, newSlip]
            setUploadedSlips(newSlips)

            addBotMessage(`✅ **ได้รับสลิปเรียบร้อยค่ะ!** น้องน้ำกำลังบันทึกออเดอร์ให้นะคะ...`)
            await createFinalOrder(newSlips, 'PENDING')
        } catch (e: any) {
            addBotMessage(`❌ เกิดข้อผิดพลาด: ${e.message}`)
        } finally {
            setIsLoading(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    // ============ AI Chat ============

    const handleSend = async () => {
        if (!input.trim() || isLoading) return
        const userMsg = input.trim()
        setInput('')

        if (orderStep !== 'idle' && /(ยกเลิก|ไม่เอา|พอแค่นี้|cancel)/i.test(userMsg)) {
            cancelOrder()
            return
        }
        if (/สั่งน้ำ|order|สั่งซื้อ/.test(userMsg) && orderStep === 'idle') {
            startOrder()
            return
        }

        addUserMessage(userMsg)
        setIsLoading(true)

        try {
            const history = messages.map(m => ({
                role: m.role === 'user' ? 'user' : 'assistant',
                content: m.content
            }))
            const res = await askNongNam(userMsg, history)
            addBotMessage(res.message)
        } catch {
            addBotMessage('เกิดข้อผิดพลาดในการเชื่อมต่อค่ะ 🙏')
        } finally {
            setIsLoading(false)
        }
    }

    const handleQuickAction = async (chip: string) => {
        if (isLoading) return
        if (chip === 'อยากสั่งน้ำ') {
            startOrder()
            return
        }
        addUserMessage(chip)
        setIsLoading(true)
        try {
            const history = messages.map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content }))
            const res = await askNongNam(chip, history)
            addBotMessage(res.message)
        } catch {
            addBotMessage('เกิดข้อผิดพลาดค่ะ 🙏')
        } finally {
            setIsLoading(false)
        }
    }

    // ============ Rendering ============

    const renderProgressBar = () => {
        if (orderStep === 'idle') return null
        let stepNum = 1
        if (orderStep === 'select_member') stepNum = 2
        if (orderStep === 'select_products') stepNum = 3
        if (orderStep === 'confirm' || orderStep === 'waiting_slip') stepNum = 4

        const steps = [
            { icon: 'building', label: 'กลุ่ม', active: stepNum >= 1 },
            { icon: 'person', label: 'ผู้สั่ง', active: stepNum >= 2 },
            { icon: 'cart', label: 'สินค้า', active: stepNum >= 3 },
            { icon: 'credit-card', label: 'ชำระเงิน', active: stepNum >= 4 },
        ]

        return (
            <div className="d-flex justify-content-between mb-3 px-4 pt-3 pb-2 bg-white shadow-sm chat-wizard-step" style={{ borderBottom: '1px solid #e9ecef' }}>
                {steps.map((s, idx) => (
                    <div key={idx} className={`text-center ${s.active ? 'text-primary fw-bold' : 'text-muted'}`} style={{ transition: 'all 0.3s ease' }}>
                        <i className={`bi bi-${s.icon} d-block mb-1`} style={{ fontSize: s.active ? '1.1rem' : '1rem' }}></i>
                        <small style={{ fontSize: '0.65rem' }}>{s.label}</small>
                    </div>
                ))}
            </div>
        )
    }

    const renderMessage = (m: ChatMessage, i: number) => {
        const isUser = m.role === 'user'
        return (
            <div key={i} className={`d-flex mb-3 chat-wizard-step ${isUser ? 'justify-content-end' : 'justify-content-start'}`}>
                {!isUser && (
                    <div className="flex-shrink-0 me-2 mt-1">
                        <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center shadow-sm"
                            style={{ width: '32px', height: '32px', fontSize: '0.9rem' }}>
                            <i className="bi bi-robot"></i>
                        </div>
                    </div>
                )}
                <div
                    className={`p-2 px-3 shadow-sm ${isUser ? 'bg-primary text-white' : 'bg-white text-dark'}`}
                    style={{
                        maxWidth: '85%', fontSize: '0.85rem', lineHeight: '1.5',
                        borderRadius: isUser ? '1rem 0.25rem 1rem 1rem' : '0.25rem 1rem 1rem 1rem',
                        whiteSpace: 'pre-line',
                        border: isUser ? 'none' : '1px solid #e9ecef',
                        overflowX: 'auto'
                    }}
                >
                    {m.type === 'order_success' && (
                        <div className="text-center mb-2 success-icon">
                            <i className="bi bi-check-circle-fill text-success" style={{ fontSize: '3rem' }}></i>
                        </div>
                    )}
                    {m.type === 'slip_preview' && m.imageUrl && (
                        <div style={{ marginBottom: '6px', textAlign: 'center' }}>
                            <img src={m.imageUrl} alt="สลิป" style={{
                                maxWidth: '140px', maxHeight: '180px', objectFit: 'contain',
                                borderRadius: '8px', border: '2px solid rgba(255,255,255,0.5)',
                            }} />
                        </div>
                    )}
                    {m.content.includes('```mermaid') ? (
                        m.content.split('```').map((part, pIdx) => {
                            if (part.startsWith('mermaid\n')) {
                                const mermaidCode = part.replace('mermaid\n', '').trim();
                                return (
                                    <div key={pIdx} className="mermaid my-2" style={{ backgroundColor: 'white', borderRadius: '8px', padding: '10px' }}>
                                        {mermaidCode}
                                    </div>
                                );
                            }
                            return <span key={pIdx}>{part}</span>;
                        })
                    ) : (
                        m.content
                    )}

                    {m.type === 'order_pending' && m.qrCodeUrl && (
                        <div style={{ marginTop: '10px', textAlign: 'center' }}>
                            <div className="p-2 bg-light rounded-3 shadow-sm d-inline-block">
                                <img src={m.qrCodeUrl} alt="QR Code" style={{
                                    width: '150px', height: '150px', objectFit: 'contain',
                                    borderRadius: '8px', cursor: 'pointer',
                                }} onClick={() => setShowQr(m.qrCodeUrl!)} />
                                <div style={{ fontSize: '0.7rem', color: '#6c757d', marginTop: '4px' }}>
                                    <i className="bi bi-zoom-in me-1"></i>คลิกเพื่อขยาย
                                </div>
                            </div>
                            <button
                                className="btn btn-sm btn-success w-100 mt-3 shadow-sm fw-bold product-card"
                                style={{ fontSize: '0.85rem', borderRadius: '1rem' }}
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isLoading}
                            >
                                <i className="bi bi-camera-fill me-2"></i>อัพโหลดสลิป
                            </button>
                        </div>
                    )}

                    {m.type === 'excess_confirm' && (
                        <div className="mt-3">
                            <button className="btn btn-sm btn-success w-100 mb-2 fw-bold rounded-pill" onClick={() => createFinalOrder(uploadedSlips, 'PENDING')}>
                                ยืนยันดำเนินการต่อ (ยอดเกิน)
                            </button>
                            <button className="btn btn-sm btn-outline-primary w-100 fw-bold rounded-pill" onClick={() => fileInputRef.current?.click()}>
                                ส่งสลิปใบที่ {uploadedSlips.length + 1} เพิ่ม
                            </button>
                        </div>
                    )}

                    {m.type === 'order_success' && m.orderId && (
                        <div style={{ marginTop: '12px' }}>
                            <a href={`/receipt/${m.orderId}`} target="_blank" rel="noopener noreferrer"
                                className="btn btn-sm btn-outline-success w-100 fw-bold product-card"
                                style={{ fontSize: '0.8rem', borderRadius: '1rem' }}>
                                <i className="bi bi-receipt me-2"></i>เปิดดูใบเสร็จ
                            </a>
                        </div>
                    )}
                </div>
            </div>
        )
    }

    const renderOrderUI = () => {
        if (orderStep === 'select_group') {
            return (
                <div className="px-3 pb-2 chat-wizard-step" style={{ backgroundColor: '#f0f4f8' }}>
                    <div className="small text-muted mb-2 fw-bold"><i className="bi bi-building me-1"></i>ออเดอร์ให้กลุ่มงานใดคะ:</div>
                    <div style={{ maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }}>
                        {groups.map(g => (
                            <button key={g.id} className="btn btn-sm btn-light border w-100 mb-2 text-start d-flex justify-content-between align-items-center product-card shadow-sm"
                                style={{ fontSize: '0.8rem', borderRadius: '0.75rem', padding: '8px 12px' }}
                                onClick={() => selectGroup(g)}>
                                <span><i className="bi bi-folder2-open text-warning me-2"></i>{g.name}</span>
                                <i className="bi bi-chevron-right text-muted small"></i>
                            </button>
                        ))}
                    </div>
                </div>
            )
        }

        if (orderStep === 'select_member' && selectedGroup) {
            const filteredMembers = selectedGroup.members.filter(m =>
                m.name.toLowerCase().includes(memberSearchTerm.toLowerCase())
            )
            return (
                <div className="px-3 pb-2 chat-wizard-step" style={{ backgroundColor: '#f0f4f8' }}>
                    <div className="d-flex justify-content-between align-items-center mb-2">
                        <div className="small text-muted fw-bold"><i className="bi bi-person me-1"></i>เลือกชื่อผู้สั่ง:</div>
                        <span className="badge bg-primary rounded-pill">{selectedGroup.name}</span>
                    </div>
                    <div className="input-group input-group-sm mb-2 shadow-sm rounded-3 overflow-hidden">
                        <span className="input-group-text bg-white border-0"><i className="bi bi-search text-muted"></i></span>
                        <input type="text" className="form-control border-0 bg-white"
                            placeholder="ค้นหาชื่อ..."
                            value={memberSearchTerm}
                            onChange={e => setMemberSearchTerm(e.target.value)}
                        />
                    </div>
                    <div style={{ maxHeight: '180px', overflowY: 'auto', paddingRight: '4px' }}>
                        {filteredMembers.map(m => (
                            <button key={m.id} className="btn btn-sm btn-light border w-100 mb-2 text-start d-flex justify-content-between align-items-center product-card shadow-sm"
                                style={{ fontSize: '0.8rem', borderRadius: '0.75rem', padding: '8px 12px' }}
                                onClick={() => selectMember(m)}>
                                <span><i className="bi bi-person-circle text-primary me-2"></i>{m.name}</span>
                                <i className="bi bi-chevron-right text-muted small"></i>
                            </button>
                        ))}
                    </div>
                </div>
            )
        }

        if (orderStep === 'select_products') {
            const total = products.reduce((sum, p) => sum + p.price * (cart[p.id] || 0), 0)
            const totalItems = Object.values(cart).reduce((a, b) => a + b, 0)
            return (
                <div className="px-3 pb-2 chat-wizard-step" style={{ backgroundColor: '#f0f4f8' }}>
                    <div className="small text-muted mb-2 fw-bold"><i className="bi bi-cart me-1"></i>เลือกสินค้า:</div>
                    {products.map(p => {
                        const count = cart[p.id] || 0
                        return (
                            <div key={p.id} className="d-flex align-items-center justify-content-between bg-white rounded-4 p-3 mb-2 shadow-sm product-card">
                                <div>
                                    <div className="fw-bold text-dark" style={{ fontSize: '0.85rem' }}>{p.name}</div>
                                    <div className="text-primary fw-semibold" style={{ fontSize: '0.75rem' }}>{p.price} บาท/แพ็ค</div>
                                </div>
                                <div className="d-flex align-items-center bg-light rounded-pill p-1">
                                    <button className="btn btn-sm btn-white rounded-circle shadow-sm" style={{ width: '26px', height: '26px', padding: 0 }}
                                        onClick={() => updateCart(p.id, -1)} disabled={count === 0}><i className="bi bi-dash"></i></button>
                                    <span className="fw-bold mx-2" style={{ fontSize: '0.85rem' }}>{count}</span>
                                    <button className="btn btn-sm btn-primary rounded-circle shadow-sm" style={{ width: '26px', height: '26px', padding: 0 }}
                                        onClick={() => updateCart(p.id, 1)}><i className="bi bi-plus"></i></button>
                                </div>
                            </div>
                        )
                    })}
                    <div className="d-flex justify-content-between align-items-center mt-3 bg-white p-2 px-3 rounded-pill shadow-sm">
                        <div className="fw-bold text-dark" style={{ fontSize: '0.85rem' }}>รวม: <span className="text-primary">{total}</span> บาท</div>
                        <button className="btn btn-sm btn-primary px-3 rounded-pill"
                            disabled={totalItems === 0} onClick={confirmProducts}>ถัดไป <i className="bi bi-arrow-right ms-1"></i></button>
                    </div>
                </div>
            )
        }

        if (orderStep === 'confirm' && pendingOrder) {
            return (
                <div className="px-3 pb-3 chat-wizard-step" style={{ backgroundColor: '#f0f4f8' }}>
                    <div className="bg-white rounded-4 p-3 shadow-sm mb-3">
                        <h6 className="fw-bold text-center mb-3">ตรวจสอบความถูกต้อง</h6>
                        <div className="small mb-3">
                            <div className="d-flex justify-content-between mb-1"><span>ผู้สั่ง:</span><span className="fw-bold">{pendingOrder.memberName}</span></div>
                            {pendingOrder.items.map((item, idx) => (
                                <div key={idx} className="d-flex justify-content-between mb-1">
                                    <span>{item.name} x{item.quantity}</span>
                                    <span>{item.price * item.quantity} ฿</span>
                                </div>
                            ))}
                            <hr className="my-2" />
                            <div className="d-flex justify-content-between fw-bold"><span>ยอดสุทธิ</span><span className="text-primary">{pendingOrder.total} ฿</span></div>
                        </div>
                    </div>
                    <div className="d-flex gap-2">
                        <button className="btn btn-light border flex-grow-1 rounded-pill" onClick={cancelOrder}>ยกเลิก</button>
                        <button className="btn btn-success flex-grow-1 text-white fw-bold rounded-pill" onClick={confirmOrder}>ยืนยัน</button>
                    </div>
                </div>
            )
        }

        if (orderStep === 'waiting_slip') {
            return (
                <div className="px-3 pb-3 chat-wizard-step" style={{ backgroundColor: '#f0f4f8' }}>
                    <div className="bg-white p-3 rounded-4 shadow-sm text-center border border-success border-opacity-25">
                        <i className="bi bi-cloud-arrow-up text-success fs-2 d-block mb-2"></i>
                        <h6 className="fw-bold text-success mb-1">ส่งสลิปเพื่อยืนยัน</h6>
                        {uploadedSlips.length > 0 && (
                            <div className="badge bg-success mb-2">ได้รับแล้ว {uploadedSlips.length} ใบ</div>
                        )}
                        <button className="btn btn-success w-100 fw-bold rounded-pill shadow-sm mt-2"
                            onClick={() => fileInputRef.current?.click()} disabled={isLoading}>
                            <i className="bi bi-image me-2"></i>เลือกรูปสลิป
                        </button>
                    </div>
                </div>
            )
        }
        return null
    }

    return (
        <>
            <style>{`
                @keyframes slideUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
                .chat-wizard-step { animation: slideUp 0.35s ease forwards; }
                .chat-scroll-area::-webkit-scrollbar { width: 4px; }
                .chat-scroll-area::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
            `}</style>

            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png" style={{ display: 'none' }} onChange={handleSlipUpload} />

            <div className="position-fixed bottom-0 end-0 p-3" style={{ zIndex: 1050 }}>
                {isOpen && (
                    <div className="card shadow-lg mb-3 border-0 overflow-hidden"
                        style={{ width: '380px', height: '600px', borderRadius: '1.25rem', display: 'flex', flexDirection: 'column' }}>
                        <div className="card-header text-white d-flex justify-content-between align-items-center py-3 border-0"
                            style={{ background: 'linear-gradient(135deg, #0d6efd, #0dcaf0)', flexShrink: 0 }}>
                            <div className="d-flex align-items-center">
                                <div className="bg-white text-primary rounded-circle d-flex align-items-center justify-content-center me-2" style={{ width: '32px', height: '32px' }}>
                                    <i className="bi bi-robot fs-5"></i>
                                </div>
                                <div>
                                    <h6 className="mb-0 fw-bold">น้องน้ำ</h6>
                                    <div style={{ fontSize: '0.65rem', opacity: 0.9 }}>ผู้ช่วยสั่งน้ำ พร้อมให้บริการค่ะ 💧</div>
                                </div>
                            </div>
                            <button className="btn-close btn-close-white" onClick={() => setIsOpen(false)}></button>
                        </div>

                        {renderProgressBar()}

                        <div className="card-body overflow-auto p-3 chat-scroll-area" ref={scrollRef} style={{ backgroundColor: '#f0f4f8', flex: 1 }}>
                            {messages.map((m, i) => renderMessage(m, i))}
                            {isLoading && (
                                <div className="d-flex justify-content-start mb-3 chat-wizard-step">
                                    <div className="bg-white p-2 px-3 shadow-sm text-muted" style={{ borderRadius: '1rem', fontSize: '0.85rem' }}>
                                        น้องน้ำกำลังพิมพ์...
                                    </div>
                                </div>
                            )}
                        </div>

                        <div>{renderOrderUI()}</div>

                        {orderStep === 'idle' && (
                            <div className="p-3 bg-white border-top">
                                <div className="d-flex gap-2 mb-2">
                                    {['อยากสั่งน้ำ', 'สรุปสถิติรอบนี้'].map(chip => (
                                        <button key={chip} className="btn btn-xs btn-outline-primary rounded-pill py-1 px-3"
                                            style={{ fontSize: '0.75rem' }} onClick={() => handleQuickAction(chip)}>{chip}</button>
                                    ))}
                                </div>
                                <div className="input-group">
                                    <input type="text" className="form-control border-0 bg-light" placeholder="พิมข้อความ..."
                                        value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} />
                                    <button className="btn btn-primary" onClick={handleSend}><i className="bi bi-send-fill"></i></button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
                <button className="btn btn-primary rounded-circle shadow-lg fab-button"
                    style={{ width: '60px', height: '60px', fontSize: '1.5rem' }}
                    onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}
                    onClick={() => setIsOpen(!isOpen)}>
                    <i className={`bi bi-${isOpen ? 'x-lg' : 'chat-dots-fill'}`}></i>
                </button>
            </div>

            {showQr && (
                <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-dark bg-opacity-75"
                    style={{ zIndex: 2000 }} onClick={() => setShowQr(null)}>
                    <img src={showQr} alt="QR Big" style={{ maxWidth: '90%', maxHeight: '90%', borderRadius: '1rem' }} />
                </div>
            )}
        </>
    )
}
