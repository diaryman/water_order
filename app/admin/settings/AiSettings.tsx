'use client';

import { useState, useTransition } from 'react';
import { saveAiSettings, AiSettings } from '@/app/admin/actions';

const BEDROCK_MODELS = [
    { id: 'us.anthropic.claude-haiku-4-5-20251001-v1:0', label: 'Claude Haiku 4.5 (เร็ว / ราคาถูก) — แนะนำ' },
    { id: 'us.anthropic.claude-sonnet-4-5-20250929-v1:0', label: 'Claude Sonnet 4.5 (แม่นยำกว่า)' },
    { id: 'us.anthropic.claude-sonnet-4-20250514-v1:0', label: 'Claude Sonnet 4' },
    { id: 'us.anthropic.claude-opus-4-5-20251101-v1:0', label: 'Claude Opus 4.5 (ดีที่สุด)' },
];

const BEDROCK_REGIONS = [
    { id: 'us-east-1', label: 'US East (N. Virginia)' },
    { id: 'us-west-2', label: 'US West (Oregon)' },
    { id: 'ap-southeast-1', label: 'Asia Pacific (Singapore)' },
    { id: 'ap-northeast-1', label: 'Asia Pacific (Tokyo)' },
];

export default function AiSettingsForm({ current }: { current: AiSettings }) {
    const [form, setForm] = useState<AiSettings>(current);
    const [isPending, startTransition] = useTransition();
    const [msg, setMsg] = useState('');
    const [showSecret, setShowSecret] = useState(false);

    const set = (key: keyof AiSettings, value: string) =>
        setForm(prev => ({ ...prev, [key]: value }));

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setMsg('');
        startTransition(async () => {
            const res = await saveAiSettings(form);
            if (res?.error) {
                setMsg('❌ ' + res.error);
            } else {
                setMsg('✅ บันทึกการตั้งค่าเรียบร้อยแล้ว');
            }
        });
    };

    return (
        <div className="container py-4" style={{ maxWidth: 860 }}>
            <h2 className="fw-bold mb-1">
                <i className="bi bi-robot me-2 text-primary"></i>
                ตั้งค่าระบบตรวจสลิป (AI)
            </h2>
            <p className="text-muted mb-4 small">
                กำหนด AI Provider และข้อมูลบัญชีผู้รับที่ใช้ตรวจสอบสลิปโอนเงิน
            </p>

            {msg && (
                <div className={`alert border-0 py-2 px-3 rounded-3 mb-4 small ${msg.startsWith('✅') ? 'alert-success' : 'alert-danger'}`}>
                    {msg}
                </div>
            )}

            <form onSubmit={handleSubmit}>
                {/* Provider Selection */}
                <div className="card border-0 shadow-sm rounded-4 mb-4">
                    <div className="card-body p-4">
                        <h6 className="fw-bold mb-3"><i className="bi bi-cpu me-2 text-primary"></i>AI Provider</h6>
                        <div className="row g-3">
                            {[
                                {
                                    id: 'typhoon',
                                    label: 'Typhoon OCR + Pathumma LLM',
                                    desc: 'ค่าเริ่มต้น — ใช้ Typhoon OCR แปลงรูปสลิป แล้วส่งไป Pathumma วิเคราะห์',
                                    icon: 'bi-lightning-fill',
                                    color: '#f97316',
                                },
                                {
                                    id: 'bedrock',
                                    label: 'AWS Bedrock (Claude Vision)',
                                    desc: 'ส่งรูปสลิปไปให้ Claude วิเคราะห์โดยตรงในขั้นตอนเดียว แม่นยำกว่า เร็วกว่า',
                                    icon: 'bi-cloud-fill',
                                    color: '#0ea5e9',
                                },
                            ].map(opt => (
                                <div key={opt.id} className="col-md-6">
                                    <div
                                        className="p-3 rounded-3 border"
                                        style={{
                                            cursor: 'pointer',
                                            borderColor: form.aiProvider === opt.id ? opt.color : '#dee2e6',
                                            boxShadow: form.aiProvider === opt.id ? `0 0 0 3px ${opt.color}33` : undefined,
                                            background: form.aiProvider === opt.id ? `${opt.color}08` : '#fff',
                                        }}
                                        onClick={() => set('aiProvider', opt.id as AiSettings['aiProvider'])}
                                    >
                                        <div className="d-flex align-items-center mb-1">
                                            <i className={`bi ${opt.icon} me-2`} style={{ color: opt.color }}></i>
                                            <strong className="small">{opt.label}</strong>
                                            {form.aiProvider === opt.id && (
                                                <span className="badge ms-auto rounded-pill small px-2" style={{ background: opt.color, color: '#fff' }}>
                                                    <i className="bi bi-check2 me-1"></i>ใช้งานอยู่
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-muted" style={{ fontSize: '0.78rem' }}>{opt.desc}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Recipient Verification */}
                <div className="card border-0 shadow-sm rounded-4 mb-4">
                    <div className="card-body p-4">
                        <h6 className="fw-bold mb-3"><i className="bi bi-person-check me-2 text-success"></i>ข้อมูลผู้รับเงิน (สำหรับตรวจสอบสลิป)</h6>
                        <div className="row g-3">
                            <div className="col-md-8">
                                <label className="form-label small fw-semibold">ชื่อบัญชีผู้รับ</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={form.recipientName}
                                    onChange={e => set('recipientName', e.target.value)}
                                    placeholder="เช่น สมชาย ใจดี"
                                    required
                                />
                                <div className="form-text">ชื่อที่ควรปรากฏในสลิปของผู้รับ ระบบจะตรวจสอบแบบ fuzzy match</div>
                            </div>
                            <div className="col-md-4">
                                <label className="form-label small fw-semibold">เลขท้ายบัญชี (4 หลัก)</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={form.recipientAccountSuffix}
                                    onChange={e => set('recipientAccountSuffix', e.target.value.replace(/\D/g, '').slice(0, 4))}
                                    placeholder="เช่น 1234"
                                    maxLength={4}
                                    required
                                />
                                <div className="form-text">เลข 4 ตัวท้ายของบัญชีที่รับโอน</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bedrock Config (conditional) */}
                {form.aiProvider === 'bedrock' && (
                    <div className="card border-0 shadow-sm rounded-4 mb-4" style={{ borderLeft: '4px solid #0ea5e9' }}>
                        <div className="card-body p-4">
                            <h6 className="fw-bold mb-3"><i className="bi bi-cloud-arrow-up me-2 text-info"></i>AWS Bedrock Configuration</h6>
                            <div className="row g-3">
                                <div className="col-md-6">
                                    <label className="form-label small fw-semibold">Region</label>
                                    <select
                                        className="form-select"
                                        value={form.bedrockRegion}
                                        onChange={e => set('bedrockRegion', e.target.value)}
                                    >
                                        {BEDROCK_REGIONS.map(r => (
                                            <option key={r.id} value={r.id}>{r.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label small fw-semibold">Model</label>
                                    <select
                                        className="form-select"
                                        value={form.bedrockModelId}
                                        onChange={e => set('bedrockModelId', e.target.value)}
                                    >
                                        {BEDROCK_MODELS.map(m => (
                                            <option key={m.id} value={m.id}>{m.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="col-12">
                                    <label className="form-label small fw-semibold">AWS Access Key ID</label>
                                    <input
                                        type="text"
                                        className="form-control font-monospace"
                                        value={form.bedrockAccessKeyId}
                                        onChange={e => set('bedrockAccessKeyId', e.target.value)}
                                        placeholder="AKIAIOSFODNN7EXAMPLE"
                                        autoComplete="off"
                                        required={form.aiProvider === 'bedrock'}
                                    />
                                </div>
                                <div className="col-12">
                                    <label className="form-label small fw-semibold">AWS Secret Access Key</label>
                                    <div className="input-group">
                                        <input
                                            type={showSecret ? 'text' : 'password'}
                                            className="form-control font-monospace"
                                            value={form.bedrockSecretAccessKey}
                                            onChange={e => set('bedrockSecretAccessKey', e.target.value)}
                                            placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
                                            autoComplete="off"
                                            required={form.aiProvider === 'bedrock'}
                                        />
                                        <button
                                            type="button"
                                            className="btn btn-outline-secondary"
                                            onClick={() => setShowSecret(v => !v)}
                                        >
                                            <i className={`bi ${showSecret ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                                        </button>
                                    </div>
                                    <div className="form-text text-warning">
                                        <i className="bi bi-shield-exclamation me-1"></i>
                                        Secret key จะถูกเก็บในฐานข้อมูล — ควรใช้ IAM user ที่มีสิทธิ์เฉพาะ <code>bedrock:InvokeModel</code> เท่านั้น
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="d-flex gap-2 align-items-center">
                    <button
                        type="submit"
                        className="btn btn-primary px-4 rounded-pill"
                        disabled={isPending}
                    >
                        {isPending
                            ? <><span className="spinner-border spinner-border-sm me-2" role="status"></span>กำลังบันทึก...</>
                            : <><i className="bi bi-floppy me-2"></i>บันทึกการตั้งค่า</>
                        }
                    </button>
                    {msg && (
                        <span className={`small ${msg.startsWith('✅') ? 'text-success' : 'text-danger'}`}>{msg}</span>
                    )}
                </div>
            </form>
        </div>
    );
}
