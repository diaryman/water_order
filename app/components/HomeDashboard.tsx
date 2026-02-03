'use client';

import { useState, useEffect } from 'react';
import { getSummary } from '@/app/actions';
import { Order, OrderRound } from '@prisma/client';

type SummaryData = {
    totalSmall: number;
    totalLarge: number;
    totalPrice: number;
    orders: any[]; // Using any for nested relations or define a specific type
};

interface HomeDashboardProps {
    initialSummary: SummaryData;
    rounds: OrderRound[];
    defaultRoundId: number;
}

export default function HomeDashboard({ initialSummary, rounds, defaultRoundId }: HomeDashboardProps) {
    const [selectedRound, setSelectedRound] = useState<string>(defaultRoundId.toString());
    const [summary, setSummary] = useState<SummaryData>(initialSummary);
    const [loading, setLoading] = useState(false);

    // Filter rounds to only show those that are relevant (e.g., have orders?) 
    // Or just show all? Usually just listing all matches Admin behavior.

    // Find selected round name
    const currentRoundName = rounds.find(r => r.id.toString() === selectedRound)?.roundName || 'ไม่ทราบรอบ';

    const isMounted = useState(false);

    useEffect(() => {
        // Skip the initial fetch if the selected round matches the default (data already passed via props)
        if (selectedRound === defaultRoundId.toString() && summary === initialSummary) {
            return;
        }

        // Simpler check: only skip if it's the very first render and we align with default.
        // But useEffect runs after render.
        // Let's use a ref to track if it's distinct from initial.

        // Actually, the issue might be simpler: 'use client' interacting with server action?
        // Let's just remove the check. If it causes a double fetch on mount, it's a small price for correctness.
        // Or cleaner: check if selectedRound differs from the "last fetched round" or similiar.

        // For now, let's remove the conditional return to ensure it always tries to fetch when changed.
        // But we want to avoid fetching on Mount if default is selected.


        async function fetchData() {
            setLoading(true);
            try {
                const data = await getSummary(Number(selectedRound));
                setSummary(data);
            } catch (error) {
                console.error("Failed to fetch summary:", error);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [selectedRound]);

    return (
        <div>
            {/* Round Selector */}
            <div className="d-flex justify-content-end mb-4 align-items-center">
                <label className="me-2 fw-bold text-muted">เลือกดูข้อมูลรอบ:</label>
                <select
                    className="form-select w-auto shadow-sm border-0"
                    value={selectedRound}
                    onChange={(e) => setSelectedRound(e.target.value)}
                >
                    {rounds.map(r => (
                        <option key={r.id} value={r.id}>
                            {r.roundName} {r.isAcceptingOrders ? '(เปิดรับ)' : ''}
                        </option>
                    ))}
                </select>
            </div>

            {/* Daily Summary Section */}
            <div className="row g-4 mb-5">
                <div className="col-12">
                    <h3 className="fw-bold mb-4 text-primary text-center">
                        สรุปยอดคำสั่งซื้อรอบ: <span className="text-dark">{currentRoundName}</span>
                    </h3>
                </div>

                {loading ? (
                    <div className="col-12 text-center py-5">
                        <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">กำลังโหลด...</span>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="col-md-6">
                            <div className="card card-custom p-4 text-center border-0 shadow-sm h-100" style={{ background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)' }}>
                                <i className="bi bi-droplet-fill text-primary display-3 mb-3"></i>
                                <h2 className="fw-bold display-4">{summary.totalSmall}</h2>
                                <p className="text-muted fw-bold mb-0">น้ำแพ็คเล็ก (แพ็ค)</p>
                            </div>
                        </div>
                        <div className="col-md-6">
                            <div className="card card-custom p-4 text-center border-0 shadow-sm h-100" style={{ background: 'linear-gradient(135deg, #e1f5fe 0%, #b3e5fc 100%)' }}>
                                <i className="bi bi-bucket-fill text-info display-3 mb-3"></i>
                                <h2 className="fw-bold display-4">{summary.totalLarge}</h2>
                                <p className="text-muted fw-bold mb-0">น้ำแพ็คใหญ่ (แพ็ค)</p>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Recent Orders Table */}
            <div className="card card-custom border-0 shadow-sm overflow-hidden bg-white">
                <div className="card-header bg-white border-0 py-3 d-flex justify-content-between align-items-center">
                    <h5 className="fw-bold mb-0">
                        <i className="bi bi-clock-history me-2 text-warning"></i>
                        รายการสั่งซื้อล่าสุด
                    </h5>
                </div>
                <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0 small">
                        <thead className="table-light">
                            <tr>
                                <th className="ps-4">ชื่อผู้สั่ง</th>
                                <th>รายการ</th>
                                <th className="text-end pe-4">สถานะ</th>
                            </tr>
                        </thead>
                        <tbody className={loading ? 'opacity-50' : ''}>
                            {summary.orders.map(order => (
                                <tr key={order.id}>
                                    <td className="ps-4">
                                        <div className="text-muted fw-bold" style={{ fontSize: '0.75rem' }}>
                                            {new Date(order.createdAt).toLocaleDateString("th-TH")}{" "}
                                            {new Date(order.createdAt).toLocaleTimeString("th-TH", { hour: '2-digit', minute: '2-digit' })} น.
                                        </div>
                                        <div className="fw-bold">{order.member.name}</div>
                                        <div className="smallest text-muted">{order.member.group.name}</div>
                                    </td>
                                    <td>
                                        {order.items.map((it: any) => `${it.product.name} x${it.quantity}`).join(', ')}
                                    </td>
                                    <td className="text-end pe-4 align-middle">
                                        <div className="d-flex flex-column align-items-end gap-1">
                                            <span className={`badge rounded-pill ${order.status === 'PENDING' ? 'bg-warning text-dark' :
                                                order.status === 'PAID' ? 'bg-info text-white' : 'bg-success'
                                                }`} style={{ fontSize: '0.65rem' }}>
                                                {order.status === 'PENDING' ? 'รอตรวจสอบ' :
                                                    order.status === 'PAID' ? 'ชำระแล้ว' : 'สำเร็จ'}
                                            </span>
                                            {order.status === 'PAID' && (
                                                <a
                                                    href={`/receipt/${order.id}`}
                                                    target="_blank"
                                                    className="btn btn-sm btn-outline-secondary py-0 px-2"
                                                    style={{ fontSize: '0.7rem' }}
                                                >
                                                    <i className="bi bi-file-earmark-text me-1"></i>ใบเสร็จ
                                                </a>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {summary.orders.length === 0 && !loading && (
                                <tr><td colSpan={3} className="text-center py-4 text-muted small">ยังไม่มีรายการสั่งซื้อในรอบนี้</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
