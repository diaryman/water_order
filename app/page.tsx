import { getSummary, getCurrentRound, getRounds } from '@/app/actions'
import Link from 'next/link'
import HomeDashboard from '@/app/components/HomeDashboard'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const round = await getCurrentRound()
  const rounds = await getRounds()
  const summary = await getSummary(round?.id)

  return (
    <div className="container py-5">
      {/* Organization Header */}
      <div className="text-center mb-5">
        <h1 className="fw-bold text-primary mb-2">ระบบสั่งน้ำดื่ม</h1>
        <p className="text-muted">สวัสดิการสำนักวิทยาการสารสนเทศ สำนักงานศาลปกครอง</p>
      </div>

      {/* Round Status Banner */}
      {round ? (
        <div className={`alert ${round.isAcceptingOrders ? 'alert-info' : 'alert-warning'} border-0 shadow-sm mb-5 d-flex justify-content-between align-items-center p-4`}>
          <div>
            <h4 className="alert-heading fw-bold mb-1">
              <i className="bi bi-calendar-event me-2"></i>
              รอบวัน: {round.roundName}
            </h4>
            <p className="mb-0 small">
              {round.isAcceptingOrders ? '● ขณะนี้กำลังเปิดรับออเดอร์' : '○ ขณะนี้ปิดรับออเดอร์แล้ว'}
            </p>
          </div>
          {round.isAcceptingOrders && (
            <Link href="/order" className="btn btn-primary btn-custom px-4 py-2 shadow-sm fw-bold">
              สั่งซื้อน้ำดื่ม <i className="bi bi-arrow-right ms-2"></i>
            </Link>
          )}
        </div>
      ) : (
        <div className="alert alert-secondary border-0 shadow-sm mb-5 p-4 text-center">
          <h5 className="mb-0 text-muted">ขณะนี้ยังไม่มีการเปิดรอบสั่งซื้อ</h5>
        </div>
      )}

      {/* Dashboard Section (Summary + Orders) */}
      <HomeDashboard
        initialSummary={summary}
        rounds={rounds}
        defaultRoundId={round ? round.id : (rounds.length > 0 ? rounds[0].id : 0)}
      />

      {/* Admin Footer */}
      <div className="mt-5 text-center">
        <Link href="/admin/login" className="text-muted small text-decoration-none opacity-50 hover-opacity-100">
          <i className="bi bi-shield-lock me-1"></i> สำหรับผู้ดูแลระบบ
        </Link>
      </div>
    </div>
  )
}

