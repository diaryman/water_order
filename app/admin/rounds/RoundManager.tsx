'use client'

import { useState, useTransition } from 'react'
import { createRound, toggleRoundStatus } from '@/app/actions'
import styles from './rounds.module.css'

type Round = {
    id: number
    roundName: string
    isAcceptingOrders: boolean
    isActive: boolean // Assuming isActive means "Current"
    createdAt: Date
    // ... other fields
}

export default function RoundManager({ initialRounds }: { initialRounds: Round[] }) {
    const [rounds, setRounds] = useState(initialRounds)
    const [newRoundName, setNewRoundName] = useState('')
    const [isPending, startTransition] = useTransition()

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newRoundName.trim()) return

        startTransition(async () => {
            await createRound(newRoundName)
            setNewRoundName('')
            // In a real app we might refetch or use a router refresh, 
            // but here we might rely on the server action revalidating the path and valid 'initialRounds' 
            // prop being updated if this was a server component children. 
            // However, this is a client component receiving data. 
            // For simplicity in Next.js App Router, it's better to refresh the router.
            window.location.reload() // Simple refresh to get new data
        })
    }

    const handleToggle = async (id: number, currentStatus: boolean) => {
        startTransition(async () => {
            await toggleRoundStatus(id, !currentStatus)
            window.location.reload()
        })
    }

    const handleDelete = async (id: number, roundName: string) => {
        if (!confirm(`ยืนยันลบรอบ "${roundName}"?
หากรอบนี้มีคำสั่งซื้อจะไม่สามารถลบได้`)) return;

        startTransition(async () => {
            const { deleteRound } = await import('@/app/admin/actions');
            const result = await deleteRound(id);
            if (result.error) {
                alert(result.error);
            } else {
                window.location.reload();
            }
        })
    }

    return (
        <div className={styles.container}>
            <h1>จัดการรอบการสั่งซื้อ</h1>

            <form onSubmit={handleCreate} className={styles.form}>
                <input
                    type="text"
                    value={newRoundName}
                    onChange={(e) => setNewRoundName(e.target.value)}
                    placeholder="ชื่อรอบใหม่ (เช่น รอบ 25 ม.ค.)"
                    disabled={isPending}
                    className={styles.input}
                />
                <button type="submit" disabled={isPending} className={styles.button}>
                    สร้างรอบ
                </button>
            </form>

            <div className={styles.list}>
                {rounds.map(round => (
                    <div key={round.id} className={styles.item}>
                        <div className={styles.info}>
                            <span className={styles.name}>{round.roundName}</span>
                            <span className={styles.date}>{new Date(round.createdAt).toLocaleDateString('th-TH')}</span>
                        </div>
                        <div className={styles.actions}>
                            <span className={round.isAcceptingOrders ? styles.active : styles.inactive}>
                                {round.isAcceptingOrders ? 'กำลังเปิดรับออเดอร์' : 'ปิดรับออเดอร์แล้ว'}
                            </span>
                            <button
                                onClick={() => handleToggle(round.id, round.isAcceptingOrders)}
                                disabled={isPending}
                                className={styles.toggleBtn}
                            >
                                {round.isAcceptingOrders ? 'ปิดรับ' : 'เปิดรับ'}
                            </button>
                            <button
                                onClick={() => handleDelete(round.id, round.roundName)}
                                disabled={isPending}
                                className={styles.deleteBtn}
                                title="ลบรอบ"
                            >
                                ลบ
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
