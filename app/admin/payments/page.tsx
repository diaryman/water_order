'use client';

import { useState, useEffect, ChangeEvent, MouseEvent } from 'react';
import { getAdminPaymentMethods, togglePaymentMethod, createPaymentMethod, deletePaymentMethod } from '../actions';

interface PaymentMethod {
    id: number;
    bankName: string;
    accountName: string;
    accountNumber: string;
    qrCodeUrl: string | null;
    isActive: boolean;
}

export default function AdminPaymentMethodsPage() {
    const [methods, setMethods] = useState<PaymentMethod[]>([]);

    // Form State
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [bankName, setBankName] = useState('');
    const [accountName, setAccountName] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [qrCodeUrl, setQrCodeUrl] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    // QR Modal State
    const [showQrModal, setShowQrModal] = useState(false);
    const [currentQrUrl, setCurrentQrUrl] = useState('');

    async function loadData() {
        const data = await getAdminPaymentMethods();
        setMethods(data as PaymentMethod[]);
    }

    useEffect(() => {
        loadData();
    }, []);

    async function handleToggle(id: number, current: boolean) {
        await togglePaymentMethod(id, !current);
        await loadData();
    }

    function handleEdit(method: PaymentMethod) {
        setEditingId(method.id);
        setBankName(method.bankName);
        setAccountName(method.accountName);
        setAccountNumber(method.accountNumber);
        setQrCodeUrl(method.qrCodeUrl || '');
        setShowAddForm(true);
    }

    async function handleAdd() {
        if (!bankName || !accountName || !accountNumber) return;

        let finalQrUrl = qrCodeUrl;
        if (selectedFile) {
            const formData = new FormData();
            formData.append('file', selectedFile);
            const { uploadFile } = await import('../actions');
            const uploadedUrl = await uploadFile(formData);
            if (uploadedUrl) finalQrUrl = uploadedUrl;
        }

        if (editingId) {
            // Update existing
            const { updatePaymentMethod } = await import('../actions');
            await updatePaymentMethod(editingId, bankName, accountName, accountNumber, finalQrUrl);
        } else {
            // Create new
            await createPaymentMethod(bankName, accountName, accountNumber, finalQrUrl);
        }

        resetForm();
        await loadData();
    }

    function resetForm() {
        setBankName('');
        setAccountName('');
        setAccountNumber('');
        setQrCodeUrl('');
        setSelectedFile(null);
        setShowAddForm(false);
        setEditingId(null);
    }

    async function handleDelete(id: number) {
        if (!confirm('ยืนยันลบบัญชีธนาคารนี้?')) return;
        await deletePaymentMethod(id);
        await loadData();
    }

    function showQr(url: string) {
        setCurrentQrUrl(url);
        setShowQrModal(true);
    }

    return (
        <div className="container py-4 text-dark">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="fw-bold"><i className="bi bi-credit-card-2-front text-primary me-2"></i>จัดการวิธีการชำระเงิน</h2>
                <button className="btn btn-primary btn-custom shadow-sm" onClick={() => setShowAddForm(true)}>
                    <i className="bi bi-plus-lg me-2"></i>เพิ่มบัญชีใหม่
                </button>
            </div>

            {showAddForm && (
                <div className="card card-custom p-4 mb-4 shadow-sm border-0 bg-white">
                    <h5 className="fw-bold mb-3">{editingId ? 'แก้ไขบัญชี' : 'เพิ่มบัญชีธนาคาร/พร้อมเพย์'}</h5>
                    <div className="row g-3">
                        <div className="col-md-3">
                            <label className="form-label small">ธนาคาร/ผู้ให้บริการ</label>
                            <input
                                type="text"
                                className="form-control"
                                value={bankName}
                                onChange={(e: ChangeEvent<HTMLInputElement>) => setBankName(e.target.value)}
                                placeholder="เช่น กสิกรไทย, พร้อมเพย์"
                            />
                        </div>
                        <div className="col-md-3">
                            <label className="form-label small">ชื่อบัญชี</label>
                            <input
                                type="text"
                                className="form-control"
                                value={accountName}
                                onChange={(e: ChangeEvent<HTMLInputElement>) => setAccountName(e.target.value)}
                                placeholder="ชื่อ นามสกุล"
                            />
                        </div>
                        <div className="col-md-3">
                            <label className="form-label small">เลขที่บัญชี / เบอร์โทร</label>
                            <input
                                type="text"
                                className="form-control"
                                value={accountNumber}
                                onChange={(e: ChangeEvent<HTMLInputElement>) => setAccountNumber(e.target.value)}
                            />
                        </div>
                        <div className="col-md-3">
                            <label className="form-label small">อัปโหลด QR Code</label>
                            <input
                                type="file"
                                className="form-control"
                                accept="image/*"
                                onChange={(e: ChangeEvent<HTMLInputElement>) => e.target.files?.[0] && setSelectedFile(e.target.files[0])}
                            />
                        </div>
                        <div className="col-12 d-flex justify-content-end gap-2 mt-3">
                            <button className="btn btn-success px-4" onClick={handleAdd} disabled={!bankName || !accountName || !accountNumber}>บันทึก</button>
                            <button className="btn btn-light px-4" onClick={resetForm}>ยกเลิก</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="card card-custom shadow-sm border-0 bg-white">
                <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                        <thead className="table-light">
                            <tr>
                                <th className="ps-4">ธนาคาร</th>
                                <th>ชื่อบัญชี</th>
                                <th>เลขที่บัญชี</th>
                                <th className="text-center">QR Code</th>
                                <th>สถานะ</th>
                                <th>จัดการ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {methods.map((m: PaymentMethod) => (
                                <tr key={m.id}>
                                    <td className="ps-4 fw-bold">{m.bankName}</td>
                                    <td>{m.accountName}</td>
                                    <td>{m.accountNumber}</td>
                                    <td className="text-center">
                                        {m.qrCodeUrl ? (
                                            <i
                                                className="bi bi-qr-code text-primary fs-5"
                                                title="คลิกเพื่อดูรูป QR"
                                                onClick={() => m.qrCodeUrl && showQr(m.qrCodeUrl)}
                                                style={{ cursor: 'pointer' }}
                                            ></i>
                                        ) : <span className="text-muted small">ไม่มี</span>}
                                    </td>
                                    <td>
                                        <div className="form-check form-switch">
                                            <input
                                                className="form-check-input shadow-none"
                                                type="checkbox"
                                                role="switch"
                                                checked={m.isActive}
                                                onChange={() => handleToggle(m.id, m.isActive)}
                                            />
                                        </div>
                                    </td>
                                    <td>
                                        <button
                                            className="btn btn-sm btn-outline-primary me-2"
                                            onClick={() => handleEdit(m)}
                                        >
                                            <i className="bi bi-pencil"></i>
                                        </button>
                                        <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(m.id)}>
                                            <i className="bi bi-trash"></i>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {methods.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="text-center py-5 text-muted fst-italic">
                                        ยังไม่ข้อมูลการชำระเงิน กรุณาเพิ่มข้อมูลเพื่อให้ผู้ใช้งานโอนเงินได้
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* QR Code Modal */}
            {showQrModal && (
                <div
                    className="modal fade show d-block"
                    style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
                    onClick={() => setShowQrModal(false)}
                >
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content" onClick={(e: MouseEvent<HTMLDivElement>) => e.stopPropagation()}>
                            <div className="modal-header">
                                <h5 className="modal-title">QR Code สำหรับชำระเงิน</h5>
                                <button type="button" className="btn-close" onClick={() => setShowQrModal(false)}></button>
                            </div>
                            <div className="modal-body text-center">
                                <img src={currentQrUrl} alt="QR Code" className="img-fluid" style={{ maxHeight: '500px' }} />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

