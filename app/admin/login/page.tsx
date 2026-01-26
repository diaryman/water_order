'use client'

import { useActionState } from 'react'
import { login } from '../actions'

const initialState = {
    error: '',
}

export default function AdminLogin() {
    const [state, formAction, isPending] = useActionState(login, initialState)

    return (
        <div className="container d-flex align-items-center justify-content-center min-vh-100 bg-light">
            <div className="card card-custom p-5 shadow-lg" style={{ maxWidth: '400px', width: '100%' }}>
                <div className="text-center mb-4">
                    <i className="bi bi-shield-lock-fill display-1 text-primary"></i>
                    <h3 className="mt-3">ผู้ดูแลระบบ</h3>
                    <p className="text-muted mb-1">สวัสดิการสำนักวิทยาการสารสนเทศ สำนักงานศาลปกครอง</p>
                    <p className="text-muted small">กรุณาเข้าสู่ระบบเพื่อจัดการข้อมูล</p>
                </div>

                <form action={formAction}>
                    <div className="mb-3">
                        <input
                            type="text"
                            name="username"
                            className="form-control form-control-lg"
                            placeholder="ชื่อผู้ใช้ (Username)"
                            required
                            autoFocus
                        />
                    </div>
                    <div className="mb-4">
                        <input
                            type="password"
                            name="password"
                            className="form-control form-control-lg"
                            placeholder="รหัสผ่าน (Password)"
                            required
                        />
                    </div>
                    {state?.error && <div className="alert alert-danger text-center">{state.error}</div>}
                    <button type="submit" disabled={isPending} className="btn btn-primary btn-lg w-100 btn-custom">
                        {isPending ? 'กำลังตรวจสอบ...' : 'เข้าสู่ระบบ'}
                    </button>
                </form>
            </div>
        </div>
    )
}
