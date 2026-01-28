'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function SearchFilter({
    showStatus = false,
    showDate = false,
    placeholder = "ค้นหา..."
}: {
    showStatus?: boolean,
    showDate?: boolean,
    placeholder?: string
}) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Initial state from URL
    const [search, setSearch] = useState(searchParams.get('search') || '');
    const [status, setStatus] = useState(searchParams.get('status') || 'ALL');
    const [date, setDate] = useState(searchParams.get('date') || '');

    // Update URL helper
    const updateUrl = (key: string, value: string) => {
        const params = new URLSearchParams(searchParams);
        if (value && value !== 'ALL') {
            params.set(key, value);
        } else {
            params.delete(key);
        }
        router.replace(`${pathname}?${params.toString()}`);
    };

    // Debounce search input
    useEffect(() => {
        const timeout = setTimeout(() => {
            if (search !== (searchParams.get('search') || '')) {
                updateUrl('search', search);
            }
        }, 500);
        return () => clearTimeout(timeout);
    }, [search]);

    return (
        <div className="card shadow-sm mb-4 border-0">
            <div className="card-body p-3">
                <div className="row g-3">
                    {/* Search Input */}
                    <div className="col-md">
                        <div className="input-group">
                            <span className="input-group-text bg-light border-end-0">
                                <i className="bi bi-search text-muted"></i>
                            </span>
                            <input
                                type="text"
                                className="form-control border-start-0 ps-0 bg-light"
                                placeholder={placeholder}
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Status Select */}
                    {showStatus && (
                        <div className="col-md-auto">
                            <select
                                className="form-select"
                                value={status}
                                onChange={(e) => {
                                    setStatus(e.target.value);
                                    updateUrl('status', e.target.value);
                                }}
                            >
                                <option value="ALL">สถานะทั้งหมด</option>
                                <option value="PENDING">รอตรวจสอบ</option>
                                <option value="PAID">จ่ายแล้ว</option>
                                <option value="COMPLETED">สำเร็จ</option>
                                <option value="CANCELLED">ยกเลิก</option>
                            </select>
                        </div>
                    )}

                    {/* Date Picker */}
                    {showDate && (
                        <div className="col-md-auto">
                            <input
                                type="date"
                                className="form-control"
                                value={date}
                                onChange={(e) => {
                                    setDate(e.target.value);
                                    updateUrl('date', e.target.value);
                                }}
                            />
                        </div>
                    )}

                    {/* Reset Button */}
                    {(search || (status !== 'ALL' && showStatus) || date) && (
                        <div className="col-md-auto">
                            <button
                                className="btn btn-outline-secondary w-100"
                                onClick={() => {
                                    setSearch('');
                                    setStatus('ALL');
                                    setDate('');
                                    router.replace(pathname);
                                }}
                            >
                                <i className="bi bi-x-circle me-1"></i>
                                ล้างค่า
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
