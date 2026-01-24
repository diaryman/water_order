'use client';

import { useState, useEffect } from 'react';
import { getAdminProducts, updateProductPrice, toggleProductAvailability, createProduct, deleteProduct } from '../actions';

export default function AdminProductsPage() {
    const [products, setProducts] = useState<any[]>([]);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editPrice, setEditPrice] = useState<number>(0);

    // New Product Form State
    const [showAddForm, setShowAddForm] = useState(false);
    const [newName, setNewName] = useState('');
    const [newPrice, setNewPrice] = useState<number>(0);
    const [newType, setNewType] = useState('SMALL');

    useEffect(() => {
        loadProducts();
    }, []);

    async function loadProducts() {
        const data = await getAdminProducts();
        setProducts(data);
    }

    async function handleToggle(id: number, current: boolean) {
        await toggleProductAvailability(id, !current);
        loadProducts();
    }

    async function handleSavePrice(id: number) {
        if (editPrice < 0) return;
        await updateProductPrice(id, editPrice);
        setEditingId(null);
        loadProducts();
    }

    async function handleAddProduct() {
        if (!newName || newPrice <= 0) return;
        await createProduct(newName, newPrice, newType);
        setNewName('');
        setNewPrice(0);
        setShowAddForm(false);
        loadProducts();
    }

    async function handleDelete(id: number) {
        if (!confirm('ยืนยันลบสินค้านี้?')) return;
        const res = await deleteProduct(id);
        if (res.error) {
            alert(res.error);
        } else {
            loadProducts();
        }
    }

    return (
        <div className="container py-4 text-dark">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="fw-bold"><i className="bi bi-box-seam text-primary me-2"></i>จัดการสินค้า</h2>
                <button className="btn btn-primary btn-custom shadow-sm" onClick={() => setShowAddForm(true)}>
                    <i className="bi bi-plus-lg me-2"></i>เพิ่มสินค้าใหม่
                </button>
            </div>

            {showAddForm && (
                <div className="card card-custom p-4 mb-4 shadow-sm border-0 bg-white">
                    <h5 className="fw-bold mb-3">เพิ่มสินค้าใหม่</h5>
                    <div className="row g-3">
                        <div className="col-md-4">
                            <label className="form-label small">ชื่อสินค้า</label>
                            <input type="text" className="form-control" value={newName} onChange={e => setNewName(e.target.value)} placeholder="เช่น น้ำดื่มตราศาล" />
                        </div>
                        <div className="col-md-3">
                            <label className="form-label small">ราคา (บาท)</label>
                            <input type="number" className="form-control" value={newPrice} onChange={e => setNewPrice(Number(e.target.value))} />
                        </div>
                        <div className="col-md-3">
                            <label className="form-label small">ประเภท</label>
                            <select className="form-select" value={newType} onChange={e => setNewType(e.target.value)}>
                                <option value="SMALL">แพ็คเล็ก</option>
                                <option value="LARGE">แพ็คใหญ่</option>
                            </select>
                        </div>
                        <div className="col-md-2 d-flex align-items-end gap-2">
                            <button className="btn btn-success w-100" onClick={handleAddProduct}>บันทึก</button>
                            <button className="btn btn-light w-100" onClick={() => setShowAddForm(false)}>ยกเลิก</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="card card-custom shadow-sm border-0 bg-white">
                <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                        <thead className="table-light">
                            <tr>
                                <th className="ps-4">สินค้า</th>
                                <th style={{ width: '200px' }}>ราคา (บาท)</th>
                                <th style={{ width: '150px' }}>สถานะ</th>
                                <th style={{ width: '150px' }}>จัดการ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.map(product => (
                                <tr key={product.id}>
                                    <td className="ps-4">
                                        <div className="d-flex align-items-center">
                                            <div className={`rounded-circle bg-light p-2 me-3 d-flex align-items-center justify-content-center`} style={{ width: 45, height: 45 }}>
                                                <i className={`bi ${product.type === 'SMALL' ? 'bi-droplet-fill text-info' : 'bi-bucket-fill text-primary'} fs-5`}></i>
                                            </div>
                                            <div>
                                                <div className="fw-bold">{product.name}</div>
                                                <div className="small text-muted">{product.type === 'SMALL' ? 'แพ็คเล็ก' : 'แพ็คใหญ่'}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        {editingId === product.id ? (
                                            <div className="input-group input-group-sm">
                                                <input
                                                    type="number"
                                                    className="form-control"
                                                    value={editPrice}
                                                    onChange={(e) => setEditPrice(Number(e.target.value))}
                                                />
                                                <button className="btn btn-success" onClick={() => handleSavePrice(product.id)}>
                                                    <i className="bi bi-check"></i>
                                                </button>
                                                <button className="btn btn-outline-secondary" onClick={() => setEditingId(null)}>
                                                    <i className="bi bi-x"></i>
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="d-flex align-items-center gap-2">
                                                <span className="fs-5 fw-bold text-primary">{product.price}</span>
                                                <button className="btn btn-link btn-sm p-0" onClick={() => { setEditingId(product.id); setEditPrice(product.price); }}>
                                                    <i className="bi bi-pencil small"></i>
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                    <td>
                                        <div className="form-check form-switch">
                                            <input
                                                className="form-check-input shadow-none"
                                                type="checkbox"
                                                role="switch"
                                                checked={product.isAvailable}
                                                onChange={() => handleToggle(product.id, product.isAvailable)}
                                            />
                                            <label className="form-check-label small text-muted">
                                                {product.isAvailable ? 'พร้อมขาย' : 'ระงับ'}
                                            </label>
                                        </div>
                                    </td>
                                    <td>
                                        <button
                                            className="btn btn-sm btn-outline-danger"
                                            onClick={() => handleDelete(product.id)}
                                        >
                                            <i className="bi bi-trash me-1"></i> ลบ
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

