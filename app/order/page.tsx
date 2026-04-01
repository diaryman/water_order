'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getGroups, getMembers, getProducts, getPaymentMethods } from '../actions';
import { chatbotUploadSlipAndCreateOrder, chatbotVerifySlip } from '@/app/chatbot-actions';
import { uploadFile } from '@/app/admin/actions';
import { useToast } from '@/app/components/ToastProvider';

// Types
type Group = { id: number; name: string };
type Member = { id: number; name: string; groupId: number };
type Product = { id: number; name: string; price: number; type: string };
type PaymentMethod = { id: number; bankName: string; accountName: string; accountNumber: string; qrCodeUrl: string | null };

// Step Navigator Component
const StepNavigator = ({ step }: { step: number }) => (
    <div className="position-fixed" style={{ top: '100px', right: '30px', zIndex: 1000 }}>
        <div className="card shadow-sm border-0" style={{ width: '200px' }}>
            <div className="card-body p-3">
                <h6 className="fw-bold mb-3 text-center">ขั้นตอนการสั่งซื้อ</h6>
                <div className="d-flex flex-column gap-2">
                    <div className={`d-flex align-items-center p-2 rounded ${step === 1 ? 'bg-primary text-white' : step > 1 ? 'bg-success text-white' : 'bg-light text-muted'}`}>
                        <div className="me-2" style={{ width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid currentColor' }}>
                            {step > 1 ? '✓' : '1'}
                        </div>
                        <small className="fw-bold">ระบุผู้สั่งซื้อ</small>
                    </div>
                    <div className={`d-flex align-items-center p-2 rounded ${step === 2 ? 'bg-primary text-white' : step > 2 ? 'bg-success text-white' : 'bg-light text-muted'}`}>
                        <div className="me-2" style={{ width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid currentColor' }}>
                            {step > 2 ? '✓' : '2'}
                        </div>
                        <small className="fw-bold">เลือกสินค้า</small>
                    </div>
                    <div className={`d-flex align-items-center p-2 rounded ${step === 3 ? 'bg-primary text-white' : step > 3 ? 'bg-success text-white' : 'bg-light text-muted'}`}>
                        <div className="me-2" style={{ width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid currentColor' }}>
                            {step > 3 ? '✓' : '3'}
                        </div>
                        <small className="fw-bold">ชำระเงิน</small>
                    </div>
                    <div className={`d-flex align-items-center p-2 rounded ${step === 4 ? 'bg-success text-white' : 'bg-light text-muted'}`}>
                        <div className="me-2" style={{ width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid currentColor' }}>
                            {step === 4 ? '✓' : '4'}
                        </div>
                        <small className="fw-bold">เสร็จสมบูรณ์</small>
                    </div>
                </div>
            </div>
        </div>
    </div>
);

export default function OrderPage() {
    const router = useRouter();
    const { success, error } = useToast();
    const [step, setStep] = useState(1);
    const [groups, setGroups] = useState<Group[]>([]);
    const [members, setMembers] = useState<Member[]>([]);
    const [products, setProducts] = useState<Product[]>([]);

    // Selection State
    const [selectedGroupId, setSelectedGroupId] = useState<number | ''>('');
    const [selectedMemberId, setSelectedMemberId] = useState<number | ''>('');
    const [cart, setCart] = useState<{ [key: number]: number }>({}); // productId -> quantity
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
    const [createdOrder, setCreatedOrder] = useState<any>(null);
    const [uploadingSlip, setUploadingSlip] = useState(false);
    const [analyzingSlip, setAnalyzingSlip] = useState(false);
    const [uploadedSlips, setUploadedSlips] = useState<Array<{ url: string, amount: number, bank: string, date: string, time: string, name: string, isCorrectRecipient: boolean | null, recipientName: string, recipientAccount: string }>>([]);

    // QR Modal State
    const [showQrModal, setShowQrModal] = useState(false);
    const [currentQrUrl, setCurrentQrUrl] = useState('');

    // Load initial data
    useEffect(() => {
        getGroups().then(setGroups);
        getProducts().then(setProducts);

        // Remember Me: Load from localStorage
        const savedGroupId = localStorage.getItem('water_selectedGroupId');
        const savedMemberId = localStorage.getItem('water_selectedMemberId');
        if (savedGroupId) setSelectedGroupId(Number(savedGroupId));
        if (savedMemberId) setSelectedMemberId(Number(savedMemberId));
    }, []);

    // Remember Me: Save to localStorage
    useEffect(() => {
        if (selectedGroupId) localStorage.setItem('water_selectedGroupId', String(selectedGroupId));
        if (selectedMemberId) localStorage.setItem('water_selectedMemberId', String(selectedMemberId));
    }, [selectedGroupId, selectedMemberId]);

    useEffect(() => {
        if (step === 3) {
            getPaymentMethods().then(setPaymentMethods);
        }
    }, [step]);

    // Filter members when group changes
    const filteredMembers = members.filter(m => m.groupId === Number(selectedGroupId));

    // Fetch members on group select
    useEffect(() => {
        if (selectedGroupId) {
            getMembers(Number(selectedGroupId)).then(setMembers);
        } else {
            setMembers([]);
        }
    }, [selectedGroupId]);

    const handleQuantityChange = (productId: number, change: number) => {
        setCart(prev => {
            const current = prev[productId] || 0;
            const next = Math.max(0, current + change);
            return { ...prev, [productId]: next };
        });
    };

    const calculateTotal = () => {
        return products.reduce((total, p) => total + (p.price * (cart[p.id] || 0)), 0);
    };

    const totalItems = Object.values(cart).reduce((a, b) => a + b, 0);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingSlip(true);
        setAnalyzingSlip(true);
        try {
            const formData = new FormData();
            formData.append('file', file);

            const verifyResult = await chatbotVerifySlip(formData, calculateTotal());

            if (verifyResult.success) {
                const newSlip = {
                    url: verifyResult.slipUrl as string,
                    amount: Number(verifyResult.analysis.amount),
                    bank: (verifyResult.analysis.bank as string) || 'ธนาคารทั่วไป',
                    date: verifyResult.analysis.date as string,
                    time: verifyResult.analysis.time as string,
                    name: file.name,
                    isCorrectRecipient: (verifyResult.analysis.isCorrectRecipient ?? null) as boolean | null,
                    recipientName: (verifyResult.analysis.recipientName as string) || '',
                    recipientAccount: (verifyResult.analysis.recipientAccount as string) || ''
                };

                setUploadedSlips(prev => [...prev, newSlip]);

                if (verifyResult.analysis.isCorrectRecipient === false) {
                    error(`⚠️ แจ้งเตือน: ผู้รับในสลิปไม่ตรง! พบ "${verifyResult.analysis.recipientName || verifyResult.analysis.recipientAccount}" - โปรดตรวจสอบสลิปอีกครั้ง`);
                } else {
                    success('✅ ตรวจสอบสลิปผ่านแล้ว');
                }
            } else {
                let errorMsg = verifyResult.error || 'อัพโหลดและตรวจสอบสลิปไม่สำเร็จ';
                if (verifyResult.analysis) {
                    errorMsg += `\nข้อมูลที่พบ: ยอดเงิน ${verifyResult.analysis.amount || '-'}, วันเวลา ${verifyResult.analysis.date || '-'} ${verifyResult.analysis.time || '-'}`;
                }
                error(errorMsg);
            }
        } catch (err: any) {
            error('เกิดข้อผิดพลาด: ' + err.message);
        } finally {
            if (e.target) e.target.value = '';
            setUploadingSlip(false);
            setAnalyzingSlip(false);
        }
    };

    const handleFinalSubmit = async () => {
        if (!selectedMemberId || totalItems === 0) return;
        if (uploadedSlips.length === 0) {
            error('กรุณาอัพโหลดสลิปก่อนยืนยันสั่งซื้อ');
            return;
        }

        setIsSubmitting(true);
        try {
            const items = Object.entries(cart)
                .filter(([_, qty]) => qty > 0)
                .map(([pId, qty]) => {
                    const product = products.find(p => p.id === Number(pId));
                    return {
                        productId: Number(pId),
                        quantity: qty,
                        price: product!.price
                    };
                });

            const result = await chatbotUploadSlipAndCreateOrder(
                uploadedSlips.map(s => ({
                    url: s.url,
                    amount: s.amount,
                    bank: s.bank,
                    date: s.date,
                    time: s.time
                })),
                {
                    memberId: Number(selectedMemberId),
                    items,
                    total: calculateTotal()
                }
            );

            if (result.success) {
                setCreatedOrder({ id: result.orderId, total: calculateTotal() });
                setStep(4);
                success('ยืนยันออเดอร์เรียบร้อยแล้วค่ะ');
            } else {
                throw new Error(result.error);
            }
        } catch (err: any) {
            error(err.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่');
            setIsSubmitting(false);
        }
    };

    // Step 1: Select Member
    if (step === 1) {
        return (
            <>
                <StepNavigator step={step} />
                <div className="container py-5 animate-fade-in">
                    {/* Organization Header */}
                    <div className="text-center mb-5 animate-slide-up">
                        <h1 className="fw-bold text-primary mb-2">ระบบสั่งน้ำดื่ม</h1>
                        <p className="text-muted">สวัสดิการสำนักวิทยาการสารสนเทศ สำนักงานศาลปกครอง</p>
                    </div>

                    <div className="row justify-content-center">
                        <div className="col-md-6 text-center animate-slide-up delay-100">
                            <h2 className="mb-4">ระบุผู้สั่งซื้อ</h2>
                            <div className="card card-custom p-4 text-start">
                                <div className="mb-3">
                                    <label className="form-label">กลุ่มงาน/สำนัก</label>
                                    <select
                                        className="form-select form-select-lg"
                                        value={selectedGroupId}
                                        onChange={(e) => {
                                            setSelectedGroupId(Number(e.target.value));
                                            setSelectedMemberId('');
                                        }}
                                    >
                                        <option value="">-- เลือกกลุ่มงาน --</option>
                                        {groups.map(g => (
                                            <option key={g.id} value={g.id}>{g.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="mb-4">
                                    <label className="form-label">ชื่อสมาชิก</label>
                                    <select
                                        className="form-select form-select-lg"
                                        value={selectedMemberId}
                                        onChange={(e) => setSelectedMemberId(Number(e.target.value))}
                                        disabled={!selectedGroupId}
                                    >
                                        <option value="">-- เลือกชื่อของคุณ --</option>
                                        {filteredMembers.map(m => (
                                            <option key={m.id} value={m.id}>{m.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <button
                                    className="btn btn-primary btn-custom w-100"
                                    onClick={() => setStep(2)}
                                    disabled={!selectedMemberId}
                                >
                                    ต่อไป <i className="bi bi-arrow-right ms-2"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    // Step 2: Select Products
    if (step === 2) {
        return (
            <>
                <StepNavigator step={step} />
                <div className="container py-5 animate-fade-in">
                    <div className="text-center mb-4 animate-slide-up">
                        <h2>เลือกสินค้า</h2>
                        <p className="text-muted">เลือกจำนวนที่ต้องการ</p>
                    </div>

                    <div className="row g-4 justify-content-center mb-5">
                        {products.map((product, idx) => (
                            <div key={product.id} className={`col-md-4 animate-slide-up delay-${(idx + 1) * 100 > 300 ? 300 : (idx + 1) * 100}`}>
                                <div className="card card-custom h-100 p-3 text-center">
                                    <div className="mb-3">
                                        <i className={`bi ${product.type === 'SMALL' ? 'bi-droplet-fill text-info' : 'bi-bucket-fill text-primary'} display-1`}></i>
                                    </div>
                                    <h4>{product.name}</h4>
                                    <h5 className="text-primary mb-4">{product.price} บาท/แพ็ค</h5>

                                    <div className="d-flex justify-content-center align-items-center gap-3">
                                        <button
                                            className="btn btn-outline-secondary rounded-circle"
                                            onClick={() => handleQuantityChange(product.id, -1)}
                                            style={{ width: 40, height: 40 }}
                                        >
                                            <i className="bi bi-dash"></i>
                                        </button>
                                        <span className="fs-4 fw-bold" style={{ width: 30 }}>{cart[product.id] || 0}</span>
                                        <button
                                            className="btn btn-primary rounded-circle"
                                            onClick={() => handleQuantityChange(product.id, 1)}
                                            style={{ width: 40, height: 40 }}
                                        >
                                            <i className="bi bi-plus"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="fixed-bottom bg-white border-top p-3 shadow-lg animate-slide-up delay-300">
                        <div className="container d-flex justify-content-between align-items-center">
                            <div>
                                <span className="text-muted small">รวมเป็นเงิน</span>
                                <h3 className="mb-0 text-primary">{calculateTotal()} บาท</h3>
                            </div>
                            <div className="d-flex gap-2">
                                <button className="btn btn-light btn-custom" onClick={() => setStep(1)}>
                                    ย้อนกลับ
                                </button>
                                <button
                                    className="btn btn-primary btn-custom px-4"
                                    onClick={() => setStep(3)}
                                    disabled={totalItems === 0}
                                >
                                    สรุปรายการ ({totalItems}) <i className="bi bi-arrow-right ms-2"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    // Step 3: Payment & Confirmation
    if (step === 3) {
        return (
            <>
                <StepNavigator step={step} />
                <div className="container py-5 animate-fade-in">
                    <div className="row justify-content-center">
                        <div className="col-md-7">
                            <div className="text-center mb-4 animate-slide-up">
                                <h2 className="fw-bold text-primary">ตรวจสอบรายการและชำระเงิน</h2>
                                <p className="text-muted">ตรวจสอบข้อมูลให้ถูกต้องก่อนยืนยันสั่งซื้อ</p>
                            </div>

                            <div className="row g-4 animate-slide-up delay-100">
                                <div className="col-lg-6">
                                    <div className="card card-custom p-4 mb-4 shadow-sm border-0 bg-white">
                                        <h5 className="fw-bold mb-3 d-flex align-items-center">
                                            <i className="bi bi-receipt text-primary me-2"></i> สรุปรายการ
                                        </h5>
                                        <div className="mb-3">
                                            <div className="small text-muted">ผู้สั่งซื้อ</div>
                                            <div className="fw-bold">{members.find(m => m.id === selectedMemberId)?.name}</div>
                                            <div className="small text-muted">{groups.find(g => g.id === selectedGroupId)?.name}</div>
                                        </div>
                                        <hr className="my-2" />
                                        {Object.entries(cart).map(([pId, qty]) => {
                                            if (qty === 0) return null;
                                            const product = products.find(p => p.id === Number(pId));
                                            return (
                                                <div key={pId} className="d-flex justify-content-between mb-2 small">
                                                    <span>{product?.name} x {qty}</span>
                                                    <span className="fw-bold">{product!.price * qty} บาท</span>
                                                </div>
                                            );
                                        })}
                                        <div className="d-flex justify-content-between fs-5 fw-bold text-primary mt-3 pt-2 border-top">
                                            <span>รวมสุทธิ</span>
                                            <span>{calculateTotal()} บาท</span>
                                        </div>
                                        <button
                                            className="btn btn-sm btn-outline-secondary mt-3 w-100"
                                            onClick={() => setStep(2)}
                                            disabled={isSubmitting}
                                        >
                                            <i className="bi bi-pencil me-1"></i> แก้ไขรายการ
                                        </button>
                                    </div>
                                </div>

                                <div className="col-lg-6">
                                    <div className="card card-custom p-4 mb-4 shadow-sm border-0 bg-white">
                                        <h5 className="fw-bold mb-3 d-flex align-items-center">
                                            <i className="bi bi-cash-coin text-success me-2"></i> ช่องทางชำระเงิน
                                        </h5>

                                        {paymentMethods.length > 0 ? (
                                            paymentMethods.map(m => (
                                                <div key={m.id} className="p-3 bg-light rounded border mb-3">
                                                    <div className="fw-bold text-primary mb-1">{m.bankName}</div>
                                                    <div className="small text-muted">ชื่อบัญชี: {m.accountName}</div>
                                                    <div className="text-dark fw-bold">{m.accountNumber}</div>
                                                    {m.qrCodeUrl && (
                                                        <div className="mt-3 text-center">
                                                            <img
                                                                src={m.qrCodeUrl}
                                                                alt="QR Code"
                                                                className="img-fluid rounded border shadow-sm"
                                                                style={{ maxWidth: '180px', cursor: 'pointer' }}
                                                                onClick={() => {
                                                                    setCurrentQrUrl(m.qrCodeUrl!);
                                                                    setShowQrModal(true);
                                                                }}
                                                                title="คลิกเพื่อขยายใหญ่"
                                                            />
                                                            <div className="small text-muted mt-1">
                                                                <i className="bi bi-zoom-in"></i> คลิกเพื่อขยาย
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))
                                        ) : (
                                            <div className="alert alert-warning small">ไม่พบข้อมูลบัญชีธนาคาร กรุณาติดต่อแอดมิน</div>
                                        )}

                                        <div className="mt-2 text-center">
                                            <label className="form-label fw-bold small d-block text-start">
                                                <i className="bi bi-paperclip me-1"></i>แนบสลิปโอนเงิน
                                            </label>

                                            {uploadingSlip ? (
                                                <div className="p-3 bg-light rounded text-center mb-3">
                                                    <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                                                    <span className="small">กำลังตรวจสอบสลิป...</span>
                                                </div>
                                            ) : null}

                                            {uploadedSlips.map((slip, idx) => (
                                                <div key={idx} className={`alert p-3 small text-start mb-3 border-0 shadow-sm ${slip.isCorrectRecipient === false ? 'alert-danger' : 'alert-success'}`}>
                                                    <div className="d-flex align-items-center mb-2">
                                                        <i className={`bi me-2 fs-5 ${slip.isCorrectRecipient === false ? 'bi-exclamation-triangle-fill text-danger' : 'bi-check-circle-fill text-success'}`}></i>
                                                        <span className={`fw-bold fs-6 ${slip.isCorrectRecipient === false ? 'text-danger' : 'text-success'}`}>ได้รับสลิปใบที่ {idx + 1} แล้ว</span>
                                                    </div>

                                                    <div className="bg-white p-2 rounded border-start border-4 border-success ms-4 mb-2">
                                                        <div className="d-flex justify-content-between mb-1">
                                                            <span className="text-muted"><i className="bi bi-bank me-1"></i> ธนาคาร</span>
                                                            <span className="fw-bold">{slip.bank}</span>
                                                        </div>
                                                        <div className="d-flex justify-content-between mb-1">
                                                            <span className="text-muted"><i className="bi bi-cash me-1"></i> ยอดโอนในสลิป</span>
                                                            <span className="fw-bold text-primary">{slip.amount.toLocaleString()} ฿</span>
                                                        </div>
                                                        <div className="d-flex justify-content-between mb-1">
                                                            <span className="text-muted"><i className="bi bi-calendar3 me-1"></i> วันเวลา</span>
                                                            <span className="fw-bold">{slip.date} {slip.time}</span>
                                                        </div>
                                                        <div className="d-flex justify-content-between">
                                                            <span className="text-muted"><i className="bi bi-person-check me-1"></i> ผู้รับ</span>
                                                            <span className={`fw-bold small ${slip.isCorrectRecipient === false ? 'text-danger' : slip.isCorrectRecipient === true ? 'text-success' : 'text-muted'}`}>
                                                                {slip.isCorrectRecipient === true && <><i className="bi bi-check-circle-fill me-1"></i>{slip.recipientName || 'ถูกต้อง'}</>}
                                                                {slip.isCorrectRecipient === false && <><i className="bi bi-x-circle-fill me-1"></i>{slip.recipientName || 'ไม่ตรง'} ⚠️</>}
                                                                {slip.isCorrectRecipient === null && <><i className="bi bi-question-circle me-1"></i>อ่านไม่ได้</>}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {slip.isCorrectRecipient === false && (
                                                        <div className="alert alert-danger p-2 mt-1 ms-4 mb-0">
                                                            <i className="bi bi-exclamation-triangle-fill me-2"></i>
                                                            <small><strong>ผู้รับไม่ตรง!</strong> พบชื่อ/เลขบัญชี <strong>{slip.recipientAccount || slip.recipientName}</strong> - กรุณาตรวจสอบสลิปอีกครั้งหรือติดต่อแอดมิน</small>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}

                                            {uploadedSlips.length > 0 && (() => {
                                                const totalPaid = uploadedSlips.reduce((sum, s) => sum + s.amount, 0);
                                                const remaining = calculateTotal() - totalPaid;

                                                if (Math.abs(remaining) < 0.01) {
                                                    return (
                                                        <div className="alert alert-success p-2 mt-2 d-flex mb-3 align-items-center">
                                                            <i className="bi bi-check-circle-fill text-success fs-4 me-2"></i>
                                                            <small className="fw-bold text-success">ยอดเงินครบถ้วนพอดีเป๊ะ! ท่านสามารถกดยืนยันออเดอร์ได้เลยค่ะ</small>
                                                        </div>
                                                    );
                                                } else if (remaining > 0) {
                                                    return (
                                                        <div className="alert alert-warning p-2 mt-3 mb-3 text-start">
                                                            <div className="d-flex mb-2">
                                                                <i className="bi bi-exclamation-triangle-fill text-warning flex-shrink-0 mt-1 me-2"></i>
                                                                <small>
                                                                    <strong>ยอดเงินยังไม่ครบ:</strong> รวมทุกสลิปได้ <span className="fw-bold">{totalPaid} ฿</span> แต่ยอดออเดอร์คือ <span className="fw-bold">{calculateTotal()} ฿</span><br />
                                                                    ยังขาดอีก <span className="text-danger fw-bold">{remaining.toFixed(2)} ฿</span> — กรุณาอัพโหลดสลิปใบถัดไปเพื่อให้ยอดรวมครบถ้วน
                                                                </small>
                                                            </div>
                                                            <div className="input-group input-group-sm mb-2">
                                                                <input type="file" className="form-control" accept="image/*" onChange={handleFileChange} disabled={uploadingSlip} />
                                                                <label className="input-group-text"><i className="bi bi-upload"></i></label>
                                                            </div>
                                                            <button className="btn btn-outline-secondary btn-sm w-100" onClick={() => setUploadedSlips([])}>
                                                                <i className="bi bi-trash me-1"></i> ล้างสลิปทั้งหมดและเริ่มใหม่
                                                            </button>
                                                        </div>
                                                    );
                                                } else {
                                                    return (
                                                        <div className="alert alert-info p-2 mt-3 mb-3 text-start">
                                                            <div className="d-flex mb-2">
                                                                <i className="bi bi-info-circle-fill text-info flex-shrink-0 mt-1 me-2"></i>
                                                                <small>
                                                                    <strong>แจ้งเตือนยอดเกิน:</strong> ยอดเงินรวมโอนเกินมา <span className="text-primary fw-bold">{Math.abs(remaining).toFixed(2)} ฿</span> (ยอดออเดอร์ทั้งหมด {calculateTotal()} ฿)<br />
                                                                    ท่านสามารถยืนยันดำเนินการต่อได้เลย และติดต่อแอดมินเพื่อขอรับส่วนเกินคืนในภายหลัง
                                                                </small>
                                                            </div>
                                                            <button className="btn btn-outline-danger btn-sm w-100" onClick={() => setUploadedSlips([])}>
                                                                <i className="bi bi-arrow-repeat me-1"></i> อัพโหลดสลิปใหม่ทั้งหมด
                                                            </button>
                                                        </div>
                                                    );
                                                }
                                            })()}

                                            {uploadedSlips.length === 0 && !uploadingSlip && (
                                                <>
                                                    <div className="input-group input-group-sm mb-1">
                                                        <input type="file" className="form-control" accept="image/*" onChange={handleFileChange} id="slipUpload" />
                                                        <label className="input-group-text" htmlFor="slipUpload"><i className="bi bi-upload"></i></label>
                                                    </div>
                                                    <p className="text-muted mt-1 text-start" style={{ fontSize: '0.7rem' }}>* แนบสลิปโอนเงินเพื่อยืนยันการชำระ</p>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="d-grid gap-2">
                                <button
                                    className="btn btn-primary btn-lg btn-custom shadow py-3 fw-bold"
                                    onClick={handleFinalSubmit}
                                    disabled={isSubmitting || (() => {
                                        const totalPaid = uploadedSlips.reduce((sum, s) => sum + s.amount, 0);
                                        const hasIncorrectRecipient = uploadedSlips.some(s => s.isCorrectRecipient === false);
                                        return hasIncorrectRecipient || (uploadedSlips.length > 0 && (calculateTotal() - totalPaid) > 0.01);
                                    })()}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                            กำลังบันทึกรายการ...
                                        </>
                                    ) : 'ยืนยันสั่งซื้อและส่งข้อมูล'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* QR Code Modal - Placed here to ensure it is rendered */}
                {showQrModal && (
                    <div
                        className="modal fade show d-block"
                        style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}
                        onClick={() => setShowQrModal(false)}
                    >
                        <div className="modal-dialog modal-dialog-centered modal-lg">
                            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                                <div className="modal-header">
                                    <h5 className="modal-title">
                                        <i className="bi bi-qr-code me-2"></i>
                                        QR Code สำหรับชำระเงิน
                                    </h5>
                                    <button type="button" className="btn-close" onClick={() => setShowQrModal(false)}></button>
                                </div>
                                <div className="modal-body text-center p-4">
                                    <img
                                        src={currentQrUrl}
                                        alt="QR Code"
                                        className="img-fluid rounded shadow"
                                        style={{ maxHeight: '600px' }}
                                    />
                                    <p className="text-muted mt-3 mb-0">
                                        <i className="bi bi-info-circle me-1"></i>
                                        แสกน QR Code เพื่อชำระเงิน
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </>
        );
    }

    // Step 4: Success
    if (step === 4) {
        return (
            <>
                <StepNavigator step={step} />
                <div className="container py-5 text-center animate-fade-in">
                    <div className="my-5 animate-slide-up delay-100">
                        <i className="bi bi-check-circle-fill text-success display-1 mb-4"></i>
                        <h1 className="mb-3">สั่งซื้อสำเร็จ!</h1>
                        <p className="lead text-muted mb-4">ขอบคุณที่ใช้บริการ ระบบได้รับข้อมูลการสั่งซื้อของท่านเรียบร้อยแล้ว</p>

                        {createdOrder && (
                            <div className="card card-custom p-4 mb-4 mx-auto shadow-sm text-start" style={{ maxWidth: '500px' }}>
                                <h5 className="fw-bold border-bottom pb-2 mb-3">ข้อมูลการสั่งซื้อ #{createdOrder.id}</h5>
                                <p className="mb-1"><strong>ผู้สั่ง:</strong> {members.find(m => m.id === Number(selectedMemberId))?.name}</p>
                                <p className="mb-1"><strong>รายการ:</strong> {products.filter(p => cart[p.id] > 0).map(p => `${p.name} x${cart[p.id]}`).join(', ')}</p>
                                <p className="mb-3"><strong>ยอดรวม:</strong> {createdOrder.total} บาท</p>

                                <button
                                    className="btn btn-outline-primary btn-sm w-100"
                                    onClick={() => {
                                        const text = `สั่งน้ำดื่ม\nออเดอร์ #${createdOrder.id}\nผู้สั่ง: ${members.find(m => m.id === Number(selectedMemberId))?.name}\nรายการ: ${products.filter(p => cart[p.id] > 0).map(p => `${p.name} x${cart[p.id]}`).join(', ')}\nยอดรวม: ${createdOrder.total} บาท\nขอบคุณครับ`;
                                        navigator.clipboard.writeText(text);
                                        success('คัดลอกข้อมูลเรียบร้อยแล้ว');
                                    }}
                                >
                                    <i className="bi bi-clipboard me-1"></i> คัดลอกรายละเอียด
                                </button>
                            </div>
                        )}

                        <Link href="/" className="btn btn-primary btn-custom btn-lg">
                            กลับหน้าหลัก
                        </Link>
                    </div>
                </div>
            </>
        );
    }
    return null;
}
