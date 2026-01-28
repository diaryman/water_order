'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getGroups, getMembers, getProducts, getPaymentMethods, createOrder } from '../actions';
import { useToast } from '@/app/components/ToastProvider';

// Types
type Group = { id: number; name: string };
type Member = { id: number; name: string; groupId: number };
type Product = { id: number; name: string; price: number; type: string };
type PaymentMethod = { id: number; bankName: string; accountName: string; accountNumber: string; qrCodeUrl: string | null };

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
    const [selectedSlip, setSelectedSlip] = useState<File | null>(null);
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
    const [createdOrder, setCreatedOrder] = useState<any>(null);

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

    // Fetch members if not loaded (or just filter if we loaded all - but better to fetch all or fetch by group)
    // For simplicity, let's fetch all members once or fetch on group change. 
    // Given the small scale, fetching all members on load is fine, or fetching on group select.
    // Let's fetch on group select to be safe.
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



    // Step 1: Select Member
    if (step === 1) {
        return (
            <div className="container py-5">
                {/* Organization Header */}
                <div className="text-center mb-5">
                    <h1 className="fw-bold text-primary mb-2">ระบบสั่งน้ำดื่ม</h1>
                    <p className="text-muted">สวัสดิการสำนักวิทยาการสารสนเทศ สำนักงานศาลปกครอง</p>
                </div>

                <div className="row justify-content-center">
                    <div className="col-md-6 text-center">
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
        );
    }

    // Step 2: Select Products
    if (step === 2) {
        return (
            <div className="container py-5">
                <div className="text-center mb-4">
                    <h2>เลือกสินค้า</h2>
                    <p className="text-muted">เลือกจำนวนที่ต้องการ</p>
                </div>

                <div className="row g-4 justify-content-center mb-5">
                    {products.map(product => (
                        <div key={product.id} className="col-md-4">
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

                <div className="fixed-bottom bg-white border-top p-3 shadow-lg">
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
        );
    }

    // Step 3 Hooks moved to top



    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
        if (!validTypes.includes(file.type)) {
            error('ประเภทไฟล์ไม่ถูกต้อง (รองรับเฉพาะ JPG, PNG)');
            e.target.value = ''; // Reset input
            return;
        }

        // Validate file size (5MB max)
        const maxSize = 5 * 1024 * 1024; // 5MB in bytes
        if (file.size > maxSize) {
            error('ไฟล์มีขนาดใหญ่เกินไป (สูงสุด 5 MB)');
            e.target.value = '';
            return;
        }

        // Validate image dimensions
        try {
            const img = new Image();
            const objectUrl = URL.createObjectURL(file);

            img.onload = () => {
                URL.revokeObjectURL(objectUrl);

                if (img.width < 200 || img.height < 200) {
                    error('ขนาดภาพเล็กเกินไป (ต้องไม่น้อยกว่า 200x200 พิกเซล)');
                    e.target.value = '';
                    return;
                }

                // All validations passed
                setSelectedSlip(file);
                success('อัพโหลดสลิปสำเร็จ');
            };

            img.onerror = () => {
                URL.revokeObjectURL(objectUrl);
                error('ไม่สามารถอ่านไฟล์ภาพได้ กรุณาลองใหม่');
                e.target.value = '';
            };

            img.src = objectUrl;
        } catch (err) {
            error('เกิดข้อผิดพลาดในการตรวจสอบไฟล์');
            e.target.value = '';
        }
    };

    const handleFinalSubmit = async () => {
        if (!selectedMemberId || totalItems === 0) return;

        // Validate slip is uploaded
        if (!selectedSlip) {
            error('กรุณาอัพโหลดสลิปการชำระเงินก่อนยืนยัน');
            return;
        }

        setIsSubmitting(true);
        try {
            let slipUrl = null;
            if (selectedSlip) {
                const { uploadSlip } = await import('../admin/actions');
                const formData = new FormData();
                formData.append('file', selectedSlip);
                slipUrl = await uploadSlip(formData);

                if (!slipUrl) {
                    throw new Error('ไม่สามารถอัพโหลดสลิปได้ กรุณาลองใหม่');
                }
            }

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

            const order = await createOrder({
                memberId: Number(selectedMemberId),
                items,
                total: calculateTotal(),
                slipUrl: slipUrl ?? undefined
            });
            setCreatedOrder(order);

            setStep(4); // Success step
        } catch (err: any) {
            error(err.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่');
            console.error(err);
            setIsSubmitting(false);
        }
    };

    if (step === 3) {
        return (
            <div className="container py-5">
                <div className="row justify-content-center">
                    <div className="col-md-7">
                        <div className="text-center mb-4">
                            <h2 className="fw-bold text-primary">ตรวจสอบรายการและชำระเงิน</h2>
                            <p className="text-muted">ตรวจสอบข้อมูลให้ถูกต้องก่อนยืนยันสั่งซื้อ</p>
                        </div>

                        <div className="row g-4">
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
                                                            style={{ maxWidth: '180px' }}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    ) : (
                                        <div className="alert alert-warning small">ไม่พบข้อมูลบัญชีธนาคาร กรุณาติดต่อแอดมิน</div>
                                    )}

                                    <div className="mt-2">
                                        <label className="form-label fw-bold small">แนบสลิปโอนเงิน</label>
                                        <div className="input-group input-group-sm">
                                            <input
                                                type="file"
                                                className="form-control"
                                                accept="image/*"
                                                onChange={handleFileChange}
                                                id="slipUpload"
                                            />
                                            <label className="input-group-text" htmlFor="slipUpload"><i className="bi bi-upload"></i></label>
                                        </div>
                                        <p className="text-muted smallest mt-1" style={{ fontSize: '0.7rem' }}>* จำเป็นต้องแนบสลิปโอนเงินก่อนยืนยันสั่งซื้อ (JPG/PNG สูงสุด 5MB)</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="d-grid gap-2">
                            <button
                                className="btn btn-primary btn-lg btn-custom shadow py-3 fw-bold"
                                onClick={handleFinalSubmit}
                                disabled={isSubmitting}
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
        );
    }


    // Step 4: Success
    if (step === 4) {
        return (
            <div className="container py-5 text-center">
                <div className="my-5">
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
        );
    }

    return null;
}
