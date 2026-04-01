'use client';

import { useState, useTransition } from 'react';
import { setTheme } from '@/app/admin/actions';

const themeGroups = [
    {
        label: 'สีสัน',
        themes: [
            { id: 'ocean', name: 'ฟ้า-ขาว', nameEn: 'Ocean', desc: 'สดใส เย็นตา สบายใจ', cls: 'prev-ocean', icon: 'bi-water', activeColor: '#0ea5e9' },
            { id: 'sunrise', name: 'ส้ม-ขาว', nameEn: 'Sunrise', desc: 'อบอุ่น มีพลังงาน', cls: 'prev-sunrise', icon: 'bi-sunrise-fill', activeColor: '#f97316' },
            { id: 'nature', name: 'เขียว-ขาว', nameEn: 'Nature', desc: 'สดชื่น ผ่อนคลาย', cls: 'prev-nature', icon: 'bi-tree-fill', activeColor: '#22c55e' },
            { id: 'violet', name: 'ม่วง-ขาว', nameEn: 'Violet', desc: 'หรูหรา ทันสมัย', cls: 'prev-violet', icon: 'bi-gem', activeColor: '#7c3aed' },
            { id: 'rose', name: 'ชมพู-ขาว', nameEn: 'Rose', desc: 'สวยงาม เรียบหรู', cls: 'prev-rose', icon: 'bi-flower1', activeColor: '#be185d' },
            { id: 'slate', name: 'เทา-ขาว', nameEn: 'Slate', desc: 'มินิมอล ดูโปร', cls: 'prev-slate', icon: 'bi-circle-half', activeColor: '#475569' },
        ]
    },
    {
        label: 'สไตล์พิเศษ',
        themes: [
            { id: 'dark-night', name: 'เข้ม-ฟ้า', nameEn: 'Dark Night', desc: 'Dark mode ครบเซต สายตาไม่ล้า', cls: 'prev-dark-night', icon: 'bi-moon-stars-fill', activeColor: '#38bdf8' },
            { id: 'glass', name: 'กระจกใส', nameEn: 'Glass', desc: 'Glassmorphism การ์ดโปร่งใสบน gradient', cls: 'prev-glass', icon: 'bi-layers-fill', activeColor: '#6366f1' },
            { id: 'mono', name: 'ขาว-ดำ', nameEn: 'Mono Clean', desc: 'Ultra minimal ไม่มีเงา เส้นสะอาด', cls: 'prev-mono', icon: 'bi-grid-1x2-fill', activeColor: '#111111' },
            { id: 'aurora', name: 'ออโรร่า', nameEn: 'Aurora', desc: 'พื้นหลัง gradient ไล่สี 3 โทน', cls: 'prev-aurora', icon: 'bi-stars', activeColor: '#8b5cf6' },
            { id: 'warm-paper', name: 'กระดาษครีม', nameEn: 'Warm Paper', desc: 'Organic อบอุ่น ให้ความรู้สึกธรรมชาติ', cls: 'prev-warm-paper', icon: 'bi-journal-text', activeColor: '#b45309' },
        ]
    }
];

const allThemes = themeGroups.flatMap(g => g.themes);

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

    const activeTheme = allThemes.find(t => t.id === active);

    return (
        <div className="container py-4" style={{ maxWidth: 980 }}>
            <div className="d-flex align-items-center gap-3 mb-1 flex-wrap">
                <h2 className="fw-bold mb-0">
                    <i className="bi bi-palette-fill me-2 text-primary"></i>
                    ตั้งค่าธีมหน้าเว็บไซต์
                </h2>
                {activeTheme && (
                    <span className="badge rounded-pill px-3 py-2"
                        style={{ background: activeTheme.activeColor, color: activeTheme.id === 'mono' ? '#fff' : '#fff', fontSize: '0.78rem' }}>
                        <i className={`bi ${activeTheme.icon} me-1`}></i>
                        {activeTheme.nameEn} — กำลังใช้งาน
                    </span>
                )}
            </div>
            <p className="text-muted mb-4 small">
                คลิกเลือกธีมที่ต้องการ — ผู้ใช้งานหน้าบ้านจะเห็นหน้าตาใหม่หลังรีเฟรชหน้า
            </p>

            {msg && (
                <div className={`alert border-0 py-2 px-3 rounded-3 mb-4 small ${msg.startsWith('✅') ? 'alert-success' : 'alert-danger'}`}>
                    {msg}
                </div>
            )}

            {themeGroups.map(group => (
                <div key={group.label} className="mb-5">
                    <div className="d-flex align-items-center gap-2 mb-3">
                        <span className="fw-bold text-muted small text-uppercase letter-spacing-1">{group.label}</span>
                        <div className="flex-grow-1 border-bottom"></div>
                    </div>
                    <div className="row g-3">
                        {group.themes.map(t => (
                            <div key={t.id} className="col-6 col-md-4 col-lg-3">
                                <div
                                    className={`t-preview ${t.cls} ${active === t.id ? 'active' : ''}`}
                                    onClick={() => handleSelect(t.id)}
                                    style={{
                                        cursor: isPending ? 'wait' : 'pointer',
                                        opacity: isPending ? 0.7 : 1,
                                        borderColor: active === t.id ? t.activeColor : 'transparent',
                                        boxShadow: active === t.id ? `0 0 0 3px ${t.activeColor}44` : undefined,
                                    }}
                                >
                                    <div className="t-prev-header" style={{ padding: '14px 12px' }}>
                                        <i className={`bi ${t.icon} fs-3 d-block mb-1`}></i>
                                        <span style={{ fontSize: '0.82rem' }}>{t.name}</span>
                                    </div>
                                    <div className="t-prev-body" style={{ padding: '8px 10px' }}>
                                        <div className="t-prev-stat mb-1">🫙 น้ำเล็ก: 12</div>
                                        <div className="t-prev-stat">🪣 น้ำใหญ่: 8</div>
                                    </div>
                                    {active === t.id && (
                                        <div className="text-center py-1" style={{ background: `${t.activeColor}18` }}>
                                            <span className="badge rounded-pill px-2" style={{ background: t.activeColor, color: '#fff', fontSize: '0.68rem' }}>
                                                <i className="bi bi-check2 me-1"></i>ใช้อยู่
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <div className="text-center mt-2">
                                    <strong className="small">{t.nameEn}</strong>
                                    <div className="text-muted mt-1" style={{ fontSize: '0.72rem', lineHeight: 1.3 }}>{t.desc}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}

            {isPending && (
                <div className="text-center mt-2 text-muted small">
                    <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                    กำลังบันทึก...
                </div>
            )}
        </div>
    );
}
