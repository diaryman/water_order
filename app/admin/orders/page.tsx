'use client';

import { useState, useEffect } from 'react';
import { getAdminOrders, updateOrderStatus, deleteOrder } from '../actions';
import { getRounds } from '@/app/actions';

type SlipPreview = {
    slips: { url: string; bank?: string | null; amount?: number | null; date?: string | null; time?: string | null }[];
    index: number;
};

export default function AdminOrdersPage() {
    const [orders, setOrders] = useState<any[]>([]);
    const [rounds, setRounds] = useState<any[]>([]);
    const [selectedRound, setSelectedRound] = useState<string>('0');
    const [previewSlip, setPreviewSlip] = useState<SlipPreview | null>(null);
    const [loading, setLoading] = useState(false);

    async function loadData() {
        setLoading(true);
        try {
            const rId = Number(selectedRound);
            const [ordersData, roundsData] = await Promise.all([
                getAdminOrders(rId),
                getRounds() // Ensure getRounds is exported from actions
            ]);
            setOrders(ordersData);
            setRounds(roundsData);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadData();
    }, [selectedRound]);

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
            <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
                <div className="d-flex align-items-center gap-3">
                    <h2 className="fw-bold m-0">
                        <i className="bi bi-cart-check text-primary me-2"></i>รายการคำสั่งซื้อ
                    </h2>
                    <select
                        className="form-select w-auto"
                        value={selectedRound}
                        onChange={(e) => setSelectedRound(e.target.value)}
                    >
                        <option value="0">--- ทั้งหมด (All) ---</option>
                        {rounds.map(r => (
                            <option key={r.id} value={r.id}>
                                {r.roundName} {r.isActive ? '(เปิดรับ)' : ''}
                            </option>
                        ))}
                    </select>
                </div>

                <a
                    href={`/admin/orders/print?roundId=${selectedRound}`}
                    target="_blank"
                    className="btn btn-outline-secondary"
                >
                    <i className="bi bi-printer me-2"></i>พิมพ์รายงาน
                </a>
            </div>

            <div className="card card-custom shadow-sm border-0 bg-white">
                <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0 small">
                        <thead className="table-light">
                            <tr>
                                <th className="ps-3">วันที่/เวลา</th>
                                <th>รอบการสั่งซื้อ</th>
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
                                        {order.round ? (
                                            <span className="badge bg-light text-dark border">
                                                {order.round.roundName}
                                            </span>
                                        ) : <span className="text-muted">-</span>}
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
                                        {(order.slips && order.slips.length > 0) ? (
                                            <div className="d-flex flex-column align-items-center gap-1">
                                                <button
                                                    className="btn btn-sm btn-light border position-relative"
                                                    onClick={() => setPreviewSlip({ slips: order.slips, index: 0 })}
                                                    title={`ดูสลิป (${order.slips.length} รูป)`}
                                                >
                                                    <i className="bi bi-image text-success"></i>
                                                    {order.slips.length > 1 && (
                                                        <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style={{ fontSize: '0.6rem' }}>
                                                            {order.slips.length}
                                                        </span>
                                                    )}
                                                </button>
                                                {order.slips[0].bank && (
                                                    <span className="text-muted" style={{ fontSize: '0.65rem' }}>{order.slips[0].bank}</span>
                                                )}
                                            </div>
                                        ) : order.slipUrl ? (
                                            <button className="btn btn-sm btn-light border" onClick={() => setPreviewSlip({ slips: [{ url: order.slipUrl }], index: 0 })} title="ดูสลิป (เก่า)">
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
                                            <a href={`/admin/orders/${order.id}/print`} target="_blank" className="btn btn-sm btn-outline-secondary">
                                                <i className="bi bi-printer"></i>
                                            </a>
                                            <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(order.id)}>
                                                <i className="bi bi-trash"></i>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {orders.length === 0 && (
                                <tr><td colSpan={8} className="text-center py-5 text-muted">ไม่พบรายการสั่งซื้อ</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Slip Preview Modal */}
            {previewSlip && (() => {
                const current = previewSlip.slips[previewSlip.index];
                const total = previewSlip.slips.length;
                return (
                    <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-dark bg-opacity-75" style={{ zIndex: 1050 }} onClick={() => setPreviewSlip(null)}>
                        <div className="bg-white rounded shadow-lg position-relative d-flex flex-column" onClick={e => e.stopPropagation()} style={{ maxWidth: '95%', maxHeight: '92vh', width: '480px' }}>
                            {/* Header */}
                            <div className="d-flex align-items-center justify-content-between px-3 py-2 border-bottom">
                                <span className="fw-bold small">
                                    <i className="bi bi-receipt me-1 text-success"></i>
                                    หลักฐานการโอนเงิน
                                    {total > 1 && <span className="text-muted ms-1">({previewSlip.index + 1}/{total})</span>}
                                </span>
                                <button className="btn-close btn-sm" onClick={() => setPreviewSlip(null)}></button>
                            </div>
                            {/* Image */}
                            <div className="overflow-auto flex-grow-1 p-2 text-center">
                                <img src={current.url} alt="Slip" className="img-fluid rounded" style={{ maxHeight: '65vh', objectFit: 'contain' }} />
                            </div>
                            {/* Info bar */}
                            {(current.bank || current.amount || current.date) && (
                                <div className="d-flex flex-wrap gap-2 justify-content-center px-3 py-2 border-top bg-light small text-muted">
                                    {current.bank && <span><i className="bi bi-bank me-1"></i>{current.bank}</span>}
                                    {current.amount && <span><i className="bi bi-currency-exchange me-1"></i>{current.amount.toLocaleString()} บาท</span>}
                                    {current.date && <span><i className="bi bi-calendar me-1"></i>{current.date}{current.time ? ' ' + current.time : ''}</span>}
                                </div>
                            )}
                            {/* Navigation */}
                            {total > 1 && (
                                <div className="d-flex justify-content-between align-items-center px-3 py-2 border-top">
                                    <button
                                        className="btn btn-sm btn-outline-secondary"
                                        disabled={previewSlip.index === 0}
                                        onClick={() => setPreviewSlip(p => p ? { ...p, index: p.index - 1 } : null)}
                                    >
                                        <i className="bi bi-chevron-left"></i> ก่อนหน้า
                                    </button>
                                    <span className="text-muted small">{previewSlip.index + 1} / {total}</span>
                                    <button
                                        className="btn btn-sm btn-outline-secondary"
                                        disabled={previewSlip.index === total - 1}
                                        onClick={() => setPreviewSlip(p => p ? { ...p, index: p.index + 1 } : null)}
                                    >
                                        ถัดไป <i className="bi bi-chevron-right"></i>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}

