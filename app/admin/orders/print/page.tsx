'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { getAdminOrders } from '../../actions';
import { getRounds } from '@/app/actions';

function PrintContent() {
    const searchParams = useSearchParams();
    const roundId = searchParams.get('roundId');
    const [orders, setOrders] = useState<any[]>([]);
    const [rounds, setRounds] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            setLoading(true);
            try {
                const rID = roundId ? Number(roundId) : undefined;
                const [o, r] = await Promise.all([
                    getAdminOrders(rID),
                    getRounds()
                ]);
                setOrders(o);
                setRounds(r);
            } catch (error) {
                console.error("Failed to load print data", error);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [roundId]);

    if (loading) return <div className="text-center py-5">กำลังโหลดข้อมูล...</div>;

    let displayOrders = orders;
    let title = "รายงานคำสั่งซื้อทั้งหมด";

    if (roundId && roundId !== '0') {
        // orders are already filtered by backend
        const r = rounds.find(r => r.id === Number(roundId));
        if (r) title = `รายงานคำสั่งซื้อ - ${r.roundName}`;
    }

    return (
        <>
            <div className="d-flex justify-content-between align-items-center mb-4 no-print">
                <h3 className="fw-bold">Pre-view รายงาน</h3>
                <div>
                    <button className="btn btn-secondary me-2" onClick={() => window.close()}>ปิด</button>
                    <button className="btn btn-primary" onClick={() => window.print()}>
                        <i className="bi bi-printer me-2"></i>พิมพ์รายงาน
                    </button>
                </div>
            </div>

            <div className="text-center mb-4">
                <h4 className="fw-bold">{title}</h4>
                <p className="small text-muted">พิมพ์เมื่อ: {new Date().toLocaleString('th-TH')}</p>
            </div>

            <table className="table table-bordered border-dark align-middle" style={{ fontSize: '0.9rem' }}>
                <thead className="table-light border-dark">
                    <tr className="text-center">
                        <th style={{ width: '5%' }}>ลำดับ</th>
                        <th style={{ width: '25%' }}>ชื่อ-นามสกุล / กลุ่มงาน</th>
                        <th style={{ width: '45%' }}>รายการที่สั่ง</th>
                        <th style={{ width: '10%' }}>ยอดเงิน</th>
                        <th style={{ width: '15%' }}>ลงชื่อรับของ</th>
                    </tr>
                </thead>
                <tbody>
                    {displayOrders.map((order, index) => (
                        <tr key={order.id}>
                            <td className="text-center">{index + 1}</td>
                            <td>
                                <div className="fw-bold">{order.member.name}</div>
                                <div className="small text-muted">{order.member.group.name}</div>
                            </td>
                            <td>
                                {order.items.map((item: any) => (
                                    <div key={item.id}>
                                        - {item.product.name} ({item.quantity})
                                    </div>
                                ))}
                            </td>
                            <td className="text-end">{order.total ? order.total.toLocaleString() : '0'}</td>
                            <td></td>
                        </tr>
                    ))}
                    {displayOrders.length === 0 && (
                        <tr>
                            <td colSpan={5} className="text-center py-4">ไม่พบข้อมูล</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </>
    );
}

// We need to wrap in Suspense because useSearchParams causes client-side deopt if not suspended boundaries
export default function PrintOrdersPage() {
    return (
        <div className="container-fluid py-4" style={{ fontFamily: 'var(--font-prompt)' }}>
            <style>{`
                @media print {
                    .no-print { display: none !important; }
                    body { -webkit-print-color-adjust: exact; }
                }
                .signature-box {
                    border-bottom: 1px dotted #000;
                    height: 30px;
                    width: 150px;
                }
            `}</style>
            <Suspense fallback={<div>Loading...</div>}>
                <PrintContent />
            </Suspense>
        </div>
    );
}
