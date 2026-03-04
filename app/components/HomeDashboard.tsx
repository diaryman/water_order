'use client';

import { useState, useEffect } from 'react';
import { getSummary } from '@/app/actions';
import { OrderRound } from '@prisma/client';

type SummaryData = {
    totalSmall: number;
    totalLarge: number;
    totalPrice: number;
    orders: any[];
};

interface HomeDashboardProps {
    initialSummary: SummaryData;
    rounds: OrderRound[];
    defaultRoundId: number;
    theme?: string;
}

export default function HomeDashboard({ initialSummary, rounds, defaultRoundId }: HomeDashboardProps) {
    const [selectedRound, setSelectedRound] = useState<string>(defaultRoundId.toString());
    const [summary, setSummary] = useState<SummaryData>(initialSummary);
    const [loading, setLoading] = useState(false);

    const currentRoundName = rounds.find(r => r.id.toString() === selectedRound)?.roundName || '';

    useEffect(() => {
        if (selectedRound === defaultRoundId.toString()) return;
        async function fetchData() {
            setLoading(true);
            try {
                const data = await getSummary(Number(selectedRound));
                setSummary(data);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [selectedRound]);

    return (
        <div>
            {/* Section header + round selector */}
            <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
                <div className="section-title mb-0">
                    สรุปยอด: {currentRoundName}
                </div>
                <div className="d-flex align-items-center gap-2">
                    <span className="t-muted small">รอบ:</span>
                    <select
                        className="theme-select"
                        value={selectedRound}
                        onChange={e => setSelectedRound(e.target.value)}
                    >
                        {rounds.map(r => (
                            <option key={r.id} value={r.id}>
                                {r.roundName}{r.isAcceptingOrders ? ' (เปิดรับ)' : ''}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Stat cards */}
            {loading ? (
                <div className="text-center py-5">
                    <div className="spinner-border" role="status" style={{ color: 'var(--t-accent)' }}>
                        <span className="visually-hidden">Loading...</span>
                    </div>
                </div>
            ) : (
                <div className="row g-3 mb-4">
                    <div className="col-md-6">
                        <div className="theme-stat">
                            <span className="stat-icon"><i className="bi bi-droplet-fill"></i></span>
                            <div className="stat-num">{summary.totalSmall}</div>
                            <div className="stat-lbl">น้ำแพ็คเล็ก (แพ็ค)</div>
                        </div>
                    </div>
                    <div className="col-md-6">
                        <div className="theme-stat s2">
                            <span className="stat-icon"><i className="bi bi-bucket-fill"></i></span>
                            <div className="stat-num">{summary.totalLarge}</div>
                            <div className="stat-lbl">น้ำแพ็คใหญ่ (แพ็ค)</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Orders table */}
            <div className="theme-card overflow-hidden">
                <div className="px-4 py-3 d-flex align-items-center" style={{ borderBottom: '1px solid var(--t-border)' }}>
                    <i className="bi bi-clock-history me-2 t-accent"></i>
                    <span className="fw-600 t-heading" style={{ fontWeight: 600 }}>รายการสั่งซื้อล่าสุด</span>
                </div>
                <div className="table-responsive">
                    <table className="table theme-table mb-0">
                        <thead>
                            <tr>
                                <th className="ps-4">ผู้สั่ง</th>
                                <th>รายการ</th>
                                <th className="text-end pe-4">สถานะ</th>
                            </tr>
                        </thead>
                        <tbody className={loading ? 'opacity-40' : ''}>
                            {summary.orders.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="text-center py-5 t-muted">
                                        <i className="bi bi-inbox me-2"></i>ยังไม่มีรายการสั่งซื้อ
                                    </td>
                                </tr>
                            ) : summary.orders.map(order => (
                                <tr key={order.id}>
                                    <td className="ps-4">
                                        <div className="t-muted" style={{ fontSize: '0.73rem' }}>
                                            {new Date(order.createdAt).toLocaleDateString('th-TH')}{' '}
                                            {new Date(order.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                                        </div>
                                        <div className="fw-bold t-heading">{order.member.name}</div>
                                        <div className="t-muted" style={{ fontSize: '0.78rem' }}>{order.member.group.name}</div>
                                    </td>
                                    <td className="t-text">
                                        {order.items.map((it: any) => `${it.product.name} ×${it.quantity}`).join(', ')}
                                    </td>
                                    <td className="text-end pe-4">
                                        <div className="d-flex flex-column align-items-end gap-1">
                                            <span
                                                className="badge rounded-pill"
                                                style={{
                                                    fontSize: '0.68rem',
                                                    background: order.status === 'PENDING'
                                                        ? '#fbbf24'
                                                        : order.status === 'PAID'
                                                            ? 'var(--t-paid-badge-bg, #0369a1)'
                                                            : '#22c55e',
                                                    color: order.status === 'PENDING'
                                                        ? '#1c1917'
                                                        : 'var(--t-paid-badge-text, #fff)',
                                                }}
                                            >
                                                {order.status === 'PENDING' ? 'รอตรวจสอบ' : order.status === 'PAID' ? 'ชำระแล้ว' : 'สำเร็จ'}
                                            </span>
                                            {order.status === 'PAID' && (
                                                <a href={`/receipt/${order.id}`} target="_blank"
                                                    className="btn btn-sm btn-outline-secondary py-0 px-2"
                                                    style={{ fontSize: '0.68rem' }}>
                                                    <i className="bi bi-file-earmark-text me-1"></i>ใบเสร็จ
                                                </a>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
