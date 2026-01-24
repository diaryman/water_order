'use client';

import { useState, useEffect } from 'react';
import { getAdminOrders, updateOrderStatus, deleteOrder } from '../actions';

export default function AdminOrdersPage() {
    const [orders, setOrders] = useState<any[]>([]);
    const [previewSlip, setPreviewSlip] = useState<string | null>(null);

    async function loadData() {
        const data = await getAdminOrders();
        setOrders(data);
    }

    useEffect(() => {
        loadData();
    }, []);

    async function handleStatus(id: number, status: string) {
        if (!confirm('ยืนยันเปลี่ยนสถานะ?')) return;
        await updateOrderStatus(id, status);
        loadData();
    }

    async function handleDelete(id: number) {
        if (!confirm('ยืนยันลบรายการสั่งซื้อนี้? (ไม่สามารถย้อนกลับได้)')) return;
        await deleteOrder(id);
        loadData();
    }

    return (
        <div className="container-fluid px-4 py-4 text-dark">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="fw-bold"><i className="bi bi-cart-check text-primary me-2"></i>รายการคำสั่งซื้อทั้งหมด</h2>
                <a href="/admin/orders/print" target="_blank" className="btn btn-outline-secondary">
                    <i className="bi bi-printer me-2"></i>พิมพ์รายงาน
                </a>
            </div>

            <div className="card card-custom shadow-sm border-0 bg-white">
                <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0 small">
                        <thead className="table-light">
                            <tr>
                                <th className="ps-3">วันที่/เวลา</th>
                                <th>ผู้สั่งซื้อ / กลุ่มงาน</th>
                                <th>รายการสินค้า</th>
                                <th className="text-end">ยอดรวม</th>
                                <th className="text-center">สลิป</th>
                                <th className="text-center">สถานะ</th>
                                <th className="text-center">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map(order => (
                                <tr key={order.id}>
                                    <td className="ps-3">
                                        <div className="fw-bold">{new Date(order.createdAt).toLocaleDateString('th-TH')}</div>
                                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>{new Date(order.createdAt).toLocaleTimeString('th-TH')}</div>
                                    </td>
                                    <td>
                                        <div className="fw-bold">{order.member.name}</div>
                                        <div className="text-muted smallest">{order.member.group.name}</div>
                                    </td>
                                    <td>
                                        {order.items.map((item: any) => (
                                            <div key={item.id} className="d-flex justify-content-between gap-3">
                                                <span className="text-muted">{item.product.name}</span>
                                                <span className="fw-bold">x{item.quantity}</span>
                                            </div>
                                        ))}
                                    </td>
                                    <td className="text-end fw-bold text-primary fs-6">{order.total.toLocaleString()}</td>
                                    <td className="text-center">
                                        {order.slipUrl ? (
                                            <button className="btn btn-sm btn-light border" onClick={() => setPreviewSlip(order.slipUrl)}>
                                                <i className="bi bi-image text-primary"></i>
                                            </button>
                                        ) : <span className="text-muted small">-</span>}
                                    </td>
                                    <td className="text-center">
                                        <span className={`badge rounded-pill px-3 py-2 ${order.status === 'PENDING' ? 'bg-warning text-dark' :
                                            order.status === 'PAID' ? 'bg-info text-white' :
                                                'bg-success'
                                            }`}>
                                            {order.status === 'PENDING' ? 'รอตรวจสอบ' :
                                                order.status === 'PAID' ? 'ชำระแล้ว' : 'เสร็จสิ้น'}
                                        </span>
                                    </td>
                                    <td className="text-center">
                                        <div className="d-flex justify-content-center gap-1">
                                            {order.status === 'PENDING' && (
                                                <button
                                                    className="btn btn-sm btn-success px-3"
                                                    onClick={() => handleStatus(order.id, 'PAID')}
                                                >
                                                    รับเงิน
                                                </button>
                                            )}
                                            {order.status === 'PAID' && (
                                                <button
                                                    className="btn btn-sm btn-primary px-3"
                                                    onClick={() => handleStatus(order.id, 'COMPLETED')}
                                                >
                                                    ส่งของ
                                                </button>
                                            )}
                                            <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(order.id)}>
                                                <i className="bi bi-trash"></i>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {orders.length === 0 && (
                                <tr><td colSpan={7} className="text-center py-5 text-muted">ไม่พบรายการสั่งซื้อ</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Slip Preview Modal (Simple implementation) */}
            {previewSlip && (
                <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-dark bg-opacity-75" style={{ zIndex: 1050 }} onClick={() => setPreviewSlip(null)}>
                    <div className="bg-white p-2 rounded shadow-lg position-relative" onClick={e => e.stopPropagation()} style={{ maxWidth: '90%', maxHeight: '90%' }}>
                        <button className="btn btn-light btn-sm position-absolute top-0 end-0 m-2 rounded-circle shadow" onClick={() => setPreviewSlip(null)}>
                            <i className="bi bi-x-lg"></i>
                        </button>
                        <img src={previewSlip} alt="Slip" className="img-fluid rounded" style={{ maxHeight: '80vh' }} />
                    </div>
                </div>
            )}
        </div>
    );
}

