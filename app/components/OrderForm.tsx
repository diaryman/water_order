'use client'

import { useState, useTransition } from 'react'
import { createOrder } from '@/app/actions'
import styles from './OrderForm.module.css'

type Product = {
    id: number
    name: string
    price: number
    type: string
    image: string | null
}

type Group = {
    id: number
    name: string
    members: { id: number, name: string }[]
}

export default function OrderForm({
    products,
    groups
}: {
    products: Product[],
    groups: Group[]
}) {
    const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null)
    const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null)
    const [quantities, setQuantities] = useState<Record<number, number>>({})
    const [isPending, startTransition] = useTransition()
    const [message, setMessage] = useState('')

    const selectedGroup = groups.find(g => g.id === selectedGroupId)

    // Calculate total
    const total = products.reduce((sum, p) => {
        const qty = quantities[p.id] || 0
        return sum + (qty * p.price)
    }, 0)

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedMemberId || total === 0) return

        const items = products
            .filter(p => (quantities[p.id] || 0) > 0)
            .map(p => ({
                productId: p.id,
                quantity: quantities[p.id],
                price: p.price
            }))

        startTransition(async () => {
            try {
                await createOrder({
                    memberId: selectedMemberId,
                    items,
                    total
                })
                setMessage('สั่งซื้อเรียบร้อยแล้ว!')
                // Reset form
                setQuantities({})
                setSelectedMemberId(null)
                setSelectedGroupId(null)
            } catch (error) {
                setMessage('เกิดข้อผิดพลาดในการสั่งซื้อ: ' + error)
            }
        })
    }

    const updateQuantity = (productId: number, delta: number) => {
        setQuantities(prev => {
            const current = prev[productId] || 0
            const next = Math.max(0, current + delta)
            return { ...prev, [productId]: next }
        })
    }

    return (
        <form onSubmit={handleSubmit} className={styles.container}>
            <h2>สั่งซื้อสินค้า</h2>
            {message && <div className={styles.message}>{message}</div>}

            <div className={styles.section}>
                <label>เลือกหน่วยงาน</label>
                <select
                    value={selectedGroupId || ''}
                    onChange={e => {
                        setSelectedGroupId(Number(e.target.value))
                        setSelectedMemberId(null)
                    }}
                    className={styles.select}
                >
                    <option value="">-- กรุณาเลือกหน่วยงาน --</option>
                    {groups.map(g => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                </select>
            </div>

            {selectedGroup && (
                <div className={styles.section}>
                    <label>เลือกชื่อผู้สั่ง</label>
                    <select
                        value={selectedMemberId || ''}
                        onChange={e => setSelectedMemberId(Number(e.target.value))}
                        className={styles.select}
                    >
                        <option value="">-- กรุณาเลือกชื่อ --</option>
                        {selectedGroup.members.map(m => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                    </select>
                </div>
            )}

            <div className={styles.products}>
                {products.map(p => (
                    <div key={p.id} className={styles.product}>
                        <div className={styles.productInfo}>
                            <strong>{p.name}</strong>
                            <span>{p.price} บาท</span>
                        </div>
                        <div className={styles.controls}>
                            <button type="button" onClick={() => updateQuantity(p.id, -1)}>-</button>
                            <span>{quantities[p.id] || 0}</span>
                            <button type="button" onClick={() => updateQuantity(p.id, 1)}>+</button>
                        </div>
                    </div>
                ))}
            </div>

            <div className={styles.footer}>
                <div className={styles.total}>รวมเป็นเงิน: {total} บาท</div>
                <button
                    type="submit"
                    disabled={!selectedMemberId || total === 0 || isPending}
                    className={styles.submitBtn}
                >
                    {isPending ? 'กำลังสั่งซื้อ...' : 'ยืนยันการสั่งซื้อ'}
                </button>
            </div>
        </form>
    )
}
