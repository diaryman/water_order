'use client';

import { useState, useTransition } from 'react';
import { setTheme } from '@/app/admin/actions';

const themes = [
    {
        id: 'ocean',
        name: 'ฟ้า-ขาว',
        nameEn: 'Ocean',
        desc: 'สีฟ้าท้องฟ้า สดใส เย็นตา สบายใจ',
        cls: 'prev-ocean',
        icon: 'bi-water',
        activeColor: '#0ea5e9',
    },
    {
        id: 'sunrise',
        name: 'ส้ม-ขาว',
        nameEn: 'Sunrise',
        desc: 'สีส้มอาทิตย์อุทัย อบอุ่น มีพลังงาน',
        cls: 'prev-sunrise',
        icon: 'bi-sunrise-fill',
        activeColor: '#f97316',
    },
    {
        id: 'nature',
        name: 'เขียว-ขาว',
        nameEn: 'Nature',
        desc: 'สีเขียวธรรมชาติ สดชื่น ผ่อนคลาย',
        cls: 'prev-nature',
        icon: 'bi-tree-fill',
        activeColor: '#22c55e',
    }
];

export default function ThemePicker({ currentTheme }: { currentTheme: string }) {
    const [active, setActive] = useState(currentTheme);
    const [isPending, startTransition] = useTransition();
    const [msg, setMsg] = useState('');

    const handleSelect = (id: string) => {
        if (isPending) return;
        setActive(id);
        setMsg('');
        startTransition(async () => {
            const res = await setTheme(id);
            if (res?.error) {
                setMsg('❌ ' + res.error);
            } else {
                setMsg('✅ เปลี่ยนธีมเรียบร้อย! รีเฟรชหน้าหลักเพื่อดูผล');
            }
        });
    };

    return (
        <div className="container py-4" style={{ maxWidth: 860 }}>
            <h2 className="fw-bold mb-1">
                <i className="bi bi-palette-fill me-2 text-primary"></i>
                ตั้งค่าธีมหน้าเว็บไซต์
            </h2>
            <p className="text-muted mb-4 small">
                คลิกเลือกธีมที่ต้องการ — ผู้ใช้งานหน้าบ้านจะเห็นหน้าตาใหม่หลังรีเฟรชหน้า
            </p>

            {msg && (
                <div className={`alert border-0 py-2 px-3 rounded-3 mb-4 small ${msg.startsWith('✅') ? 'alert-success' : 'alert-danger'}`}>
                    {msg}
                </div>
            )}

            <div className="row g-4">
                {themes.map(t => (
                    <div key={t.id} className="col-md-4">
                        <div
                            className={`t-preview ${t.cls} ${active === t.id ? 'active' : ''}`}
                            onClick={() => handleSelect(t.id)}
                            style={{
                                cursor: isPending ? 'wait' : 'pointer',
                                opacity: isPending ? 0.7 : 1,
                                borderColor: active === t.id ? t.activeColor : 'transparent',
                                boxShadow: active === t.id ? `0 0 0 4px ${t.activeColor}33` : undefined,
                            }}
                        >
                            <div className="t-prev-header">
                                <i className={`bi ${t.icon} fs-2 d-block mb-1`}></i>
                                {t.name}
                            </div>
                            <div className="t-prev-body">
                                <div className="t-prev-stat">🫙 น้ำเล็ก: 12 แพ็ค</div>
                                <div className="t-prev-stat">🪣 น้ำใหญ่: 8 แพ็ค</div>
                            </div>
                            {active === t.id && (
                                <div className="text-center py-2" style={{ background: `${t.activeColor}12` }}>
                                    <span className="badge rounded-pill px-3 small"
                                        style={{ background: t.activeColor, color: '#fff' }}>
                                        <i className="bi bi-check2 me-1"></i>กำลังใช้งาน
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="text-center mt-2">
                            <strong>{t.name}</strong>
                            <span className="text-muted ms-1 small">· {t.nameEn}</span>
                            <div className="text-muted small mt-1">{t.desc}</div>
                        </div>
                    </div>
                ))}
            </div>

            {isPending && (
                <div className="text-center mt-4 text-muted small">
                    <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                    กำลังบันทึก...
                </div>
            )}
        </div>
    );
}
