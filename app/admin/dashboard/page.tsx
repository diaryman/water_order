'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { getDashboardStats } from '@/app/admin/actions';
import { getRounds } from '@/app/actions';
import SearchFilter from '@/app/admin/components/SearchFilter';

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

const DashboardContent = () => {
    // State for dashboard data
    const [data, setData] = useState<DashboardData | null>(null);
    const [rounds, setRounds] = useState<any[]>([]);
    const [selectedRound, setSelectedRound] = useState<string>('0');
    const [loading, setLoading] = useState(true);
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    const searchParams = useSearchParams();
    const search = searchParams.get('search') || undefined;
    const status = searchParams.get('status') || undefined;

    const handleExport = () => {
        if (!data?.recentOrders) return;
        const headers = ["Order ID", "Member", "Group", "Total", "Status", "Date", "Slip URL"];
        const rows = data.recentOrders.map(o => [
            o.id,
            `"${o.member.name}"`,
            `"${o.member.group.name}"`,
            o.total,
            o.status,
            `${new Date(o.createdAt).toLocaleDateString("th-TH")} ${new Date(o.createdAt).toLocaleTimeString("th-TH")}`,
            o.slipUrl ? `"https://${window.location.host}${o.slipUrl}"` : ""
        ]);

        const csvContent = "data:text/csv;charset=utf-8,\uFEFF"
            + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `orders_export_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Fetch data on component mount or round change
    useEffect(() => {
        async function load() {
            setLoading(true);
            try {
                const rID = Number(selectedRound);
                const [stats, roundsData] = await Promise.all([
                    getDashboardStats(rID, search, status),
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
    }, [selectedRound, search, status]);

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
            {/* Organization Header */}
            <div className="text-center mb-4">
                <h1 className="fw-bold text-primary mb-1">ระบบสั่งน้ำดื่ม - แดชบอร์ด</h1>
                <p className="text-muted small">สวัสดิการสำนักวิทยาการสารสนเทศ สำนักงานศาลปกครอง</p>
            </div>

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

            {/* Quick Links */}
            <h5 className="mb-3 text-muted fw-bold small text-uppercase">เมนูจัดการข้อมูล</h5>
            <div className="row g-3 mb-5">
                <div className="col-6 col-md-3 col-lg-2">
                    <a href="/admin/rounds" className="text-decoration-none">
                        <div className="card shadow-sm border-0 h-100 text-center py-3 hover-shadow transition">
                            <i className="bi bi-clock-history display-6 text-primary mb-2"></i>
                            <div className="small fw-bold text-dark">รอบสั่งซื้อ</div>
                        </div>
                    </a>
                </div>
                <div className="col-6 col-md-3 col-lg-2">
                    <a href="/admin/orders" className="text-decoration-none">
                        <div className="card shadow-sm border-0 h-100 text-center py-3 hover-shadow transition">
                            <i className="bi bi-receipt display-6 text-success mb-2"></i>
                            <div className="small fw-bold text-dark">รายการสั่งซื้อ</div>
                        </div>
                    </a>
                </div>
                <div className="col-6 col-md-3 col-lg-2">
                    <a href="/admin/members" className="text-decoration-none">
                        <div className="card shadow-sm border-0 h-100 text-center py-3 hover-shadow transition">
                            <i className="bi bi-people display-6 text-info mb-2"></i>
                            <div className="small fw-bold text-dark">สมาชิก/กลุ่ม</div>
                        </div>
                    </a>
                </div>
                <div className="col-6 col-md-3 col-lg-2">
                    <a href="/admin/products" className="text-decoration-none">
                        <div className="card shadow-sm border-0 h-100 text-center py-3 hover-shadow transition">
                            <i className="bi bi-box-seam display-6 text-warning mb-2"></i>
                            <div className="small fw-bold text-dark">สินค้า</div>
                        </div>
                    </a>
                </div>
                <div className="col-6 col-md-3 col-lg-2">
                    <a href="/admin/payments" className="text-decoration-none">
                        <div className="card shadow-sm border-0 h-100 text-center py-3 hover-shadow transition">
                            <i className="bi bi-wallet2 display-6 text-danger mb-2"></i>
                            <div className="small fw-bold text-dark">การชำระเงิน</div>
                        </div>
                    </a>
                </div>
                <div className="col-6 col-md-3 col-lg-2">
                    <a href="/admin/logs" className="text-decoration-none">
                        <div className="card shadow-sm border-0 h-100 text-center py-3 hover-shadow transition">
                            <i className="bi bi-journal-text display-6 text-secondary mb-2"></i>
                            <div className="small fw-bold text-dark">บันทึกกิจกรรม</div>
                        </div>
                    </a>
                </div>
                <div className="col-6 col-md-3 col-lg-2">
                    <a href="/" target="_blank" className="text-decoration-none">
                        <div className="card shadow-sm border-0 h-100 text-center py-3 hover-shadow transition bg-light">
                            <i className="bi bi-box-arrow-up-right display-6 text-secondary mb-2"></i>
                            <div className="small fw-bold text-dark">หน้าเว็บไซต์</div>
                        </div>
                    </a>
                </div>
            </div>

            {/* Search Filter */}
            <SearchFilter showStatus={true} placeholder="ค้นหาชื่อ, เลขออเดอร์..." />

            <div className="row g-4">
                {/* Recent Orders */}
                <div className="col-md-8">
                    <div className="card shadow-sm border-0">
                        <div className="card-header bg-white py-3 border-0">
                            <h5 className="mb-0 fw-bold">
                                <i className="bi bi-clock-history me-2 text-primary"></i>
                                รายการสั่งซื้อล่าสุด
                            </h5>
                            <button className="btn btn-sm btn-outline-success" onClick={handleExport}>
                                <i className="bi bi-file-earmark-excel me-1"></i> Export CSV
                            </button>
                        </div>
                        <div className="card-body p-0">
                            <div className="table-responsive">
                                <table className="table table-hover align-middle mb-0">
                                    <thead className="table-light">
                                        <tr>
                                            <th>#</th>
                                            <th>ผู้สั่ง</th>
                                            <th>ยอดเงิน</th>
                                            <th>สลิป</th>
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
                                                        {order.slipUrl ? (
                                                            <button
                                                                className="btn btn-sm btn-outline-secondary"
                                                                onClick={() => setPreviewImage(order.slipUrl)}
                                                            >
                                                                <i className="bi bi-image"></i>
                                                            </button>
                                                        ) : <span className="text-muted">-</span>}
                                                    </td>
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

            {/* Image Preview Modal */}
            {
                previewImage && (
                    <div
                        className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center"
                        style={{ backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1050 }}
                        onClick={() => setPreviewImage(null)}
                    >
                        <div className="position-relative" style={{ maxWidth: '90%', maxHeight: '90%' }}>
                            <button
                                className="btn btn-close btn-close-white position-absolute top-0 end-0 m-3"
                                onClick={() => setPreviewImage(null)}
                            ></button>
                            <img
                                src={previewImage}
                                alt="Slip Preview"
                                className="img-fluid rounded"
                                style={{ maxHeight: '85vh' }}
                            />
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default function AdminDashboard() {
    return (
        <Suspense fallback={
            <div className="d-flex justify-content-center align-items-center min-vh-100">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        }>
            <DashboardContent />
        </Suspense>
    );
}
