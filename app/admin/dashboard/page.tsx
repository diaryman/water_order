'use client';

import { useEffect, useState } from 'react';
import { getDashboardStats } from '@/app/admin/actions';
import { getRounds } from '@/app/actions';

// Define types for our data
type DashboardData = {
    totalMembers: number;
    totalOrders: number;
    totalRevenue: number;
    totalSmall: number;
    totalLarge: number;
    recentOrders: any[];
    topGroups: { name: string; total: number }[];
};

export default function AdminDashboard() {
    // State for dashboard data
    const [data, setData] = useState<DashboardData | null>(null);
    const [rounds, setRounds] = useState<any[]>([]);
    const [selectedRound, setSelectedRound] = useState<string>('0');
    const [loading, setLoading] = useState(true);

    // Fetch data on component mount or round change
    useEffect(() => {
        async function load() {
            setLoading(true);
            try {
                const rID = Number(selectedRound);
                const [stats, roundsData] = await Promise.all([
                    getDashboardStats(rID),
                    getRounds()
                ]);
                setData(stats);
                setRounds(roundsData);
                setLoading(false);
            } catch (err) {
                console.error("Failed to load dashboard data:", err);
                setLoading(false);
            }
        }
        load();
    }, [selectedRound]);

    if (loading) {
        return (
            <div className="container py-5 text-center">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
                <p className="mt-2">กำลังโหลดข้อมูล...</p>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="container py-5 text-center text-danger">
                <p>ไม่สามารถโหลดข้อมูลได้</p>
            </div>
        );
    }

    return (
        <div className="container py-4">
            <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
                <h2 className="text-primary m-0">
                    <i className="bi bi-speedometer2 me-2"></i>ภาพรวมระบบ (Dashboard)
                </h2>
                <div className="d-flex align-items-center gap-2">
                    <label className="fw-bold">รอบ:</label>
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
            </div>

            {/* KPI Cards */}
            <div className="row g-4 mb-5">
                {/* Total Revenue */}
                <div className="col-md-3">
                    <div className="card shadow-sm h-100 border-0 bg-primary text-white">
                        <div className="card-body">
                            <h6 className="card-subtitle mb-2 opacity-75">ยอดขายรวม</h6>
                            <h3 className="card-title fw-bold">฿{data.totalRevenue.toLocaleString()}</h3>
                            <div className="mt-3 small">
                                <i className="bi bi-cart-check me-1"></i> {data.totalOrders} ออเดอร์
                            </div>
                        </div>
                    </div>
                </div>

                {/* Total Members */}
                <div className="col-md-3">
                    <div className="card shadow-sm h-100 border-0 bg-success text-white">
                        <div className="card-body">
                            <h6 className="card-subtitle mb-2 opacity-75">สมาชิกทั้งหมด</h6>
                            <h3 className="card-title fw-bold">{data.totalMembers.toLocaleString()}</h3>
                            <div className="mt-3 small">
                                <i className="bi bi-people-fill me-1"></i> คน
                            </div>
                        </div>
                    </div>
                </div>

                {/* Small Water */}
                <div className="col-md-3">
                    <div className="card shadow-sm h-100 border-0 bg-info text-white">
                        <div className="card-body">
                            <h6 className="card-subtitle mb-2 opacity-75">ยอดขายน้ำ (แพ็คเล็ก)</h6>
                            <h3 className="card-title fw-bold">{data.totalSmall.toLocaleString()}</h3>
                            <div className="mt-3 small">
                                <i className="bi bi-droplet me-1"></i> แพ็ค
                            </div>
                        </div>
                    </div>
                </div>

                {/* Large Water */}
                <div className="col-md-3">
                    <div className="card shadow-sm h-100 border-0 bg-info text-white">
                        <div className="card-body">
                            <h6 className="card-subtitle mb-2 opacity-75">ยอดขายน้ำ (แพ็คใหญ่)</h6>
                            <h3 className="card-title fw-bold">{data.totalLarge.toLocaleString()}</h3>
                            <div className="mt-3 small">
                                <i className="bi bi-droplet-fill me-1"></i> แพ็ค
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="row g-4">
                {/* Recent Orders */}
                <div className="col-md-8">
                    <div className="card shadow-sm border-0">
                        <div className="card-header bg-white py-3 border-0">
                            <h5 className="mb-0 fw-bold">
                                <i className="bi bi-clock-history me-2 text-primary"></i>
                                รายการสั่งซื้อล่าสุด
                            </h5>
                        </div>
                        <div className="card-body p-0">
                            <div className="table-responsive">
                                <table className="table table-hover align-middle mb-0">
                                    <thead className="table-light">
                                        <tr>
                                            <th>#</th>
                                            <th>ผู้สั่ง</th>
                                            <th>ยอดเงิน</th>
                                            <th>สถานะ</th>
                                            <th>เวลา</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.recentOrders.length > 0 ? (
                                            data.recentOrders.map((order) => (
                                                <tr key={order.id}>
                                                    <td>#{order.id}</td>
                                                    <td>
                                                        <div className="fw-bold">{order.member.name}</div>
                                                        <small className="text-muted">{order.member.group.name}</small>
                                                    </td>
                                                    <td>฿{order.total.toLocaleString()}</td>
                                                    <td>
                                                        <span className={`badge ${order.status === 'PAID' ? 'bg-success' :
                                                            order.status === 'PENDING' ? 'bg-warning text-dark' :
                                                                'bg-secondary'
                                                            }`}>
                                                            {order.status === 'PAID' ? 'จ่ายแล้ว' :
                                                                order.status === 'PENDING' ? 'รอตรวจสอบ' : order.status}
                                                        </span>
                                                    </td>
                                                    <td className="text-secondary small">
                                                        {new Date(order.createdAt).toLocaleDateString("th-TH")}{" "}
                                                        {new Date(order.createdAt).toLocaleTimeString("th-TH", { hour: '2-digit', minute: '2-digit' })}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={5} className="text-center py-4 text-muted">
                                                    ยังไม่มีรายการสั่งซื้อ
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Top Groups */}
                <div className="col-md-4">
                    <div className="card shadow-sm border-0 h-100">
                        <div className="card-header bg-white py-3 border-0">
                            <h5 className="mb-0 fw-bold">
                                <i className="bi bi-trophy me-2 text-warning"></i>
                                5 อันดับหน่วยงานยอดนิยม
                            </h5>
                        </div>
                        <div className="card-body">
                            {data.topGroups.length > 0 ? (
                                <ul className="list-group list-group-flush">
                                    {data.topGroups.map((group, index) => (
                                        <li key={index} className="list-group-item d-flex justify-content-between align-items-center py-3 border-0">
                                            <div className="d-flex align-items-center">
                                                <div className={`badge rounded-circle me-3 ${index === 0 ? 'bg-warning text-dark' :
                                                    index === 1 ? 'bg-secondary text-white' :
                                                        index === 2 ? 'bg-brown text-white' :
                                                            'bg-light text-secondary'
                                                    }`} style={{ width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    {index + 1}
                                                </div>
                                                <span className="fw-medium text-truncate" style={{ maxWidth: '150px' }}>
                                                    {group.name}
                                                </span>
                                            </div>
                                            <span className="fw-bold text-primary">฿{group.total.toLocaleString()}</span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-center text-muted py-4">ยังไม่มีข้อมูล</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
