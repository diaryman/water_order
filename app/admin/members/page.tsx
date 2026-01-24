'use client';

import { useState, useRef } from 'react';
import { getGroups, importMembersCSV, createMember, updateMember, deleteMember, createGroup, updateGroup, deleteGroup } from '../actions';
import { useEffect } from 'react';

export default function MembersPage() {
    const [groups, setGroups] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Add Member State
    // Modal State
    // Modal State
    const [modalMode, setModalMode] = useState<'member' | 'group'>('member');
    const [showFormModal, setShowFormModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [itemName, setItemName] = useState('');
    const [memberGroupId, setMemberGroupId] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Import Result Modal State
    const [showImportResultModal, setShowImportResultModal] = useState(false);
    const [importResult, setImportResult] = useState<{ count: number, skipped: number, errors: string[] } | null>(null);

    // Delete Modal State
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteItem, setDeleteItem] = useState<{ id: number; type: 'member' | 'group'; name: string } | null>(null);

    async function loadData() {
        setLoading(true);
        const data = await getGroups();
        setGroups(data);
        setLoading(false);
    }

    useEffect(() => {
        loadData();
    }, []);

    async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!confirm('ยืนยันการนำเข้าข้อมูล? ข้อมูลเดิมอาจถูกอัปเดต')) return;

        const text = await file.text();

        try {
            const result = await importMembersCSV(text);
            if (result.success) {
                setImportResult({
                    count: result.count,
                    skipped: result.skipped || 0,
                    errors: result.errors || []
                });
                setShowImportResultModal(true);
                loadData();
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        } catch (err) {
            alert('เกิดข้อผิดพลาดในการนำเข้า');
            console.error(err);
        }
    }

    // --- Form Modal Logic (Add/Edit) ---
    function openAddMember() {
        setModalMode('member');
        setIsEditing(false);
        setEditingId(null);
        setItemName('');
        setMemberGroupId('');
        setShowFormModal(true);
    }

    function openEditMember(member: any, groupId: any) {
        setModalMode('member');
        setIsEditing(true);
        setEditingId(member.id);
        setItemName(member.name);
        setMemberGroupId(groupId);
        setShowFormModal(true);
    }

    function openAddGroup() {
        setModalMode('group');
        setIsEditing(false);
        setEditingId(null);
        setItemName('');
        setShowFormModal(true);
    }

    function openEditGroup(group: any) {
        setModalMode('group');
        setIsEditing(true);
        setEditingId(group.id);
        setItemName(group.name);
        setShowFormModal(true);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSubmitting(true);

        try {
            let result;
            if (modalMode === 'member') {
                if (!itemName || !memberGroupId) return;

                if (isEditing && editingId) {
                    result = await updateMember(editingId, itemName, parseInt(memberGroupId));
                } else {
                    result = await createMember(itemName, parseInt(memberGroupId));
                }
            } else {
                // Group Mode
                if (!itemName) return;

                if (isEditing && editingId) {
                    result = await updateGroup(editingId, itemName);
                } else {
                    result = await createGroup(itemName);
                }
            }

            if (result.error) {
                alert(result.error);
            } else {
                // alert('บันทึกเรียบร้อยแล้ว');
                setShowFormModal(false);
                setItemName('');
                setMemberGroupId('');
                loadData();
            }
        } catch (error) {
            console.error(error);
            alert('เกิดข้อผิดพลาด');
        } finally {
            setSubmitting(false);
        }
    }

    // --- Delete Logic ---
    function confirmDelete(id: number, type: 'member' | 'group', name: string) {
        setDeleteItem({ id, type, name });
        setShowDeleteModal(true);
    }

    async function handleDeleteConfirmed() {
        if (!deleteItem) return;
        setSubmitting(true);

        try {
            let result;
            if (deleteItem.type === 'member') {
                result = await deleteMember(deleteItem.id);
            } else {
                result = await deleteGroup(deleteItem.id);
            }

            if (result.error) {
                alert(result.error);
            } else {
                loadData();
                setShowDeleteModal(false);
                setDeleteItem(null);
            }
        } catch (error) {
            console.error(error);
            alert('เกิดข้อผิดพลาดในการลบ');
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="container py-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2>จัดการรายชื่อสมาชิก</h2>
                <div>
                    <input
                        type="file"
                        accept=".csv"
                        className="d-none"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                    />
                    <button
                        className="btn btn-success me-2"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <i className="bi bi-file-earmark-spreadsheet me-2"></i>นำเข้า CSV
                    </button>
                    <button className="btn btn-outline-primary me-2" onClick={openAddGroup}>
                        <i className="bi bi-folder-plus me-2"></i>เพิ่มกลุ่มงาน
                    </button>
                    <button className="btn btn-primary" onClick={openAddMember}>
                        <i className="bi bi-person-plus me-2"></i>เพิ่มสมาชิก
                    </button>
                </div>
            </div>

            <div className="alert alert-info small">
                <i className="bi bi-info-circle me-2"></i>
                รูปแบบไฟล์ CSV: <strong>ชื่อ-สกุล, ชื่อกลุ่มงาน</strong> (ไม่มีหัวตาราง หรือมีหัวตารางว่า Name/ชื่อ-สกุล)
            </div>

            {loading ? (
                <div className="text-center py-5">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                </div>
            ) : (
                <div className="row g-4">
                    {groups.map(group => (
                        <div key={group.id} className="col-md-6 col-lg-4">
                            <div className="card h-100 shadow-sm">
                                <div className="card-header bg-white fw-bold d-flex justify-content-between align-items-center">
                                    <div className="text-truncate flex-grow-1" title={group.name}>{group.name}</div>
                                    <div className="d-flex align-items-center">
                                        <span className="badge bg-secondary rounded-pill me-2">{group.members.length}</span>
                                        <div className="dropdown">
                                            <button className="btn btn-link btn-sm text-secondary p-0" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                                                <i className="bi bi-three-dots-vertical"></i>
                                            </button>
                                            <ul className="dropdown-menu dropdown-menu-end">
                                                <li><button className="dropdown-item" onClick={() => openEditGroup(group)}>แก้ไขชื่อกลุ่ม</button></li>
                                                <li><hr className="dropdown-divider" /></li>
                                                <li><button className="dropdown-item text-danger" onClick={() => confirmDelete(group.id, 'group', group.name)}>ลบกลุ่มงาน</button></li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                                <div className="card-body p-0">
                                    <ul className="list-group list-group-flush">
                                        {group.members.map((m: any) => (
                                            <li key={m.id} className="list-group-item small text-muted d-flex justify-content-between align-items-center">
                                                <span>{m.name}</span>
                                                <div>
                                                    <button
                                                        className="btn btn-link btn-sm text-primary p-0 me-2"
                                                        onClick={() => openEditMember(m, group.id)}
                                                    >
                                                        <i className="bi bi-pencil-square"></i>
                                                    </button>
                                                    <button
                                                        className="btn btn-link btn-sm text-danger p-0"
                                                        onClick={() => confirmDelete(m.id, 'member', m.name)}
                                                    >
                                                        <i className="bi bi-trash"></i>
                                                    </button>
                                                </div>
                                            </li>
                                        ))}
                                        {group.members.length === 0 && (
                                            <li className="list-group-item text-center text-muted small py-4">
                                                - ไม่มีสมาชิก -
                                            </li>
                                        )}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Form Modal (Add/Edit) */}
            {showFormModal && (
                <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">
                                    {isEditing ? 'แก้ไข' : 'เพิ่ม'}
                                    {modalMode === 'member' ? 'ข้อมูลสมาชิก' : 'ข้อมูลกลุ่มงาน'}
                                </h5>
                                <button type="button" className="btn-close" onClick={() => setShowFormModal(false)}></button>
                            </div>
                            <form onSubmit={handleSubmit}>
                                <div className="modal-body">
                                    <div className="mb-3">
                                        <label className="form-label">{modalMode === 'member' ? 'ชื่อ-นามสกุล' : 'ชื่อกลุ่มงาน'}</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            required
                                            value={itemName}
                                            onChange={e => setItemName(e.target.value)}
                                        />
                                    </div>
                                    {modalMode === 'member' && (
                                        <div className="mb-3">
                                            <label className="form-label">กลุ่มงาน</label>
                                            <select
                                                className="form-select"
                                                required
                                                value={memberGroupId}
                                                onChange={e => setMemberGroupId(e.target.value)}
                                            >
                                                <option value="">-- เลือกกลุ่มงาน --</option>
                                                {groups.map(g => (
                                                    <option key={g.id} value={g.id}>{g.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowFormModal(false)}>ยกเลิก</button>
                                    <button type="submit" className="btn btn-primary" disabled={submitting}>
                                        {submitting ? 'กำลังบันทึก...' : 'บันทึก'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && deleteItem && (
                <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content">
                            <div className="modal-header bg-danger text-white">
                                <h5 className="modal-title">ยืนยันการลบ</h5>
                                <button type="button" className="btn-close btn-close-white" onClick={() => setShowDeleteModal(false)}></button>
                            </div>
                            <div className="modal-body">
                                <p>คุณต้องการลบ {deleteItem.type === 'member' ? 'สมาชิก' : 'กลุ่มงาน'} <strong>"{deleteItem.name}"</strong> ใช่หรือไม่?</p>
                                <p className="text-danger small mb-0">* การกระทำนี้ไม่สามารถเรียกคืนได้</p>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>ยกเลิก</button>
                                <button type="button" className="btn btn-danger" onClick={handleDeleteConfirmed} disabled={submitting}>
                                    {submitting ? 'กำลังลบ...' : 'ลบข้อมูล'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Import Result Modal */}
            {showImportResultModal && importResult && (
                <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content">
                            <div className="modal-header bg-success text-white">
                                <h5 className="modal-title">ผลการนำเข้าข้อมูล</h5>
                                <button type="button" className="btn-close btn-close-white" onClick={() => setShowImportResultModal(false)}></button>
                            </div>
                            <div className="modal-body">
                                <div className="text-center mb-4">
                                    <i className="bi bi-check-circle-fill text-success" style={{ fontSize: '3rem' }}></i>
                                    <h4 className="mt-2">เสร็จสิ้น</h4>
                                </div>
                                <ul className="list-group mb-3">
                                    <li className="list-group-item d-flex justify-content-between align-items-center">
                                        นำเข้าสำเร็จ
                                        <span className="badge bg-success rounded-pill">{importResult.count} รายการ</span>
                                    </li>
                                    <li className="list-group-item d-flex justify-content-between align-items-center">
                                        ข้าม (ข้อมูลซ้ำ / ไม่ครบ)
                                        <span className="badge bg-secondary rounded-pill">{importResult.skipped} รายการ</span>
                                    </li>
                                </ul>

                                {importResult.errors.length > 0 && (
                                    <div className="alert alert-warning small">
                                        <strong>ข้อผิดพลาด:</strong>
                                        <ul className="mb-0 ps-3">
                                            {importResult.errors.map((err, i) => (
                                                <li key={i}>{err}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-primary" onClick={() => setShowImportResultModal(false)}>ตกลง</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
