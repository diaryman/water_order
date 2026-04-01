'use client';

import { useState, useEffect, ChangeEvent } from 'react';
import Link from 'next/link';
import { getGroups, getMembers, getMemberOrders } from '../actions';
// We likely need to format date, let's allow basic JS date toLocaleString for now

// Types (Subset of what we need)
type Group = { id: number; name: string };
type Member = { id: number; name: string; groupId: number };
type Order = {
    id: number;
    createdAt: Date;
    total: number;
    status: string;
    items: {
        id: number;
        quantity: number;
        price: number;
        product: { name: string; type: string };
    }[];
    round: { roundName: string } | null;
};

export default function MyOrdersPage() {
    const [groups, setGroups] = useState<Group[]>([]);
    const [members, setMembers] = useState<Member[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);

    const [selectedGroupId, setSelectedGroupId] = useState<number | ''>('');
    const [selectedMemberId, setSelectedMemberId] = useState<number | ''>('');
    const [isLoading, setIsLoading] = useState(false);

    // Load initial data
    useEffect(() => {
        getGroups().then(setGroups);

        // Remember Me: Load from localStorage
        const savedGroupId = localStorage.getItem('water_selectedGroupId');
        const savedMemberId = localStorage.getItem('water_selectedMemberId');
        if (savedGroupId) setSelectedGroupId(Number(savedGroupId));
        if (savedMemberId) setSelectedMemberId(Number(savedMemberId));
    }, []);

    // Remember Me: Save to localStorage (Updating here too keeps it in sync)
    useEffect(() => {
        if (selectedGroupId) localStorage.setItem('water_selectedGroupId', String(selectedGroupId));
        if (selectedMemberId) localStorage.setItem('water_selectedMemberId', String(selectedMemberId));
    }, [selectedGroupId, selectedMemberId]);

    // Fetch members on group change
    useEffect(() => {
        if (selectedGroupId) {
            getMembers(Number(selectedGroupId)).then(setMembers);
        } else {
            setMembers([]);
        }
    }, [selectedGroupId]);

    // Fetch orders on member change
    useEffect(() => {
        if (selectedMemberId) {
            setIsLoading(true);
            getMemberOrders(Number(selectedMemberId))
                .then(setOrders)
                .finally(() => setIsLoading(false));
        } else {
            setOrders([]);
        }
    }, [selectedMemberId]);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'PENDING': return <span className="badge bg-warning text-dark">รอตรวจสอบ</span>;
            case 'PAID': return <span className="badge bg-info text-dark">ชำระแล้ว</span>;
            case 'COMPLETED': return <span className="badge bg-success">เรียบร้อย</span>;
            case 'CANCELLED': return <span className="badge bg-danger">ยกเลิก</span>;
            default: return <span className="badge bg-secondary">{status}</span>;
        }
    };

    return (
        <div className="container py-5">
            <div className="text-center mb-5">
                <h1 className="fw-bold text-primary mb-2">ประวัติการสั่งซื้อ</h1>
                <p className="text-muted">ตรวจสอบสถานะและประวัติการสั่งซื้อของคุณ</p>
            </div>

            <div className="row justify-content-center mb-5">
                <div className="col-md-8">
                    <div className="card card-custom p-4 border-0 shadow-sm bg-white">
                        <h5 className="mb-3 fw-bold">เลือกบัญชีผู้ใช้</h5>
                        <div className="row g-3">
                            <div className="col-md-6">
                                <label className="form-label small text-muted">กลุ่มงาน/สำนัก</label>
                                <select
                                    className="form-select"
                                    value={selectedGroupId}
                                    onChange={(e: ChangeEvent<HTMLSelectElement>) => {
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
                            <div className="col-md-6">
                                <label className="form-label small text-muted">ชื่อสมาชิก</label>
                                <select
                                    className="form-select"
                                    value={selectedMemberId}
                                    onChange={(e: ChangeEvent<HTMLSelectElement>) => setSelectedMemberId(Number(e.target.value))}
                                    disabled={!selectedGroupId}
                                >
                                    <option value="">-- เลือกชื่อของคุณ --</option>
                                    {members.map(m => (
                                        <option key={m.id} value={m.id}>{m.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {selectedMemberId && (
                <div className="row justify-content-center">
                    <div className="col-md-8">
                        {isLoading ? (
                            <div className="text-center py-5">
                                <div className="spinner-border text-primary" role="status">
                                    <span className="visually-hidden">Loading...</span>
                                </div>
                            </div>
                        ) : orders.length > 0 ? (
                            <div className="d-flex flex-column gap-3">
                                {orders.map(order => (
                                    <div key={order.id} className="card card-custom border-0 shadow-sm p-3">
                                        <div className="d-flex justify-content-between align-items-center mb-2 border-bottom pb-2">
                                            <div>
                                                <span className="fw-bold me-2">#{order.id}</span>
                                                <span className="text-muted small">{new Date(order.createdAt).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                            <div>{getStatusBadge(order.status)}</div>
                                        </div>
                                        <div className="mb-2">
                                            {order.items.map(item => (
                                                <div key={item.id} className="d-flex justify-content-between small text-muted">
                                                    <span>{item.product.name} x {item.quantity}</span>
                                                    <span>{item.price * item.quantity} บาท</span>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="d-flex justify-content-between align-items-center pt-2 border-top">
                                            <span className="small text-muted">รอบส่ง: {order.round?.roundName || '-'}</span>
                                            <span className="fw-bold text-primary">ยอดรวม {order.total} บาท</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-5 text-muted">
                                <i className="bi bi-basket display-4 d-block mb-3 opacity-50"></i>
                                <p>ไม่พบประวัติการสั่งซื้อ</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="text-center mt-5">
                <Link href="/" className="btn btn-outline-primary rounded-pill px-4">
                    <i className="bi bi-house me-2"></i> กลับหน้าหลัก
                </Link>
            </div>
        </div>
    );
}
