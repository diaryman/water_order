import { getSummary, getCurrentRound, getRounds } from '@/app/actions'
import { getTheme } from '@/app/admin/actions'
import Link from 'next/link'
import HomeDashboard from '@/app/components/HomeDashboard'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const round = await getCurrentRound()
  const rounds = await getRounds()
  const summary = await getSummary(round?.id)
  const theme = await getTheme()

  return (
    <div data-theme={theme} className="theme-page">
      <div className="container py-5">

        {/* Hero */}
        <div className="theme-hero text-center mb-4 anim-1">
          <h1 className="fw-bold mb-1" style={{ fontSize: '1.75rem', color: 'inherit' }}>
            <i className="bi bi-droplet-fill me-2"></i>ระบบสั่งน้ำดื่ม
          </h1>
          <p className="mb-0" style={{ opacity: 0.75, fontSize: '0.9rem' }}>
            สวัสดิการสำนักวิทยาการสารสนเทศ · สำนักงานศาลปกครอง
          </p>
        </div>

        {/* Round banner */}
        {round ? (
          <div className="theme-card p-4 mb-4 anim-2">
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
              <div>
                <div className="fw-bold t-heading" style={{ fontSize: '1.05rem' }}>
                  <i className="bi bi-calendar-event me-2 t-accent"></i>รอบ: {round.roundName}
                </div>
                <div className="mt-1 small">
                  {round.isAcceptingOrders
                    ? <span className="round-open"><i className="bi bi-circle-fill me-1" style={{ fontSize: '0.5rem' }}></i>กำลังเปิดรับออเดอร์</span>
                    : <span className="round-close">○ ปิดรับออเดอร์แล้ว</span>
                  }
                </div>
              </div>
              {round.isAcceptingOrders && (
                <Link href="/order" className="theme-btn">
                  สั่งซื้อน้ำดื่ม <i className="bi bi-arrow-right"></i>
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="theme-card p-4 mb-4 text-center anim-2">
            <span className="t-muted">ขณะนี้ยังไม่มีการเปิดรอบสั่งซื้อ</span>
          </div>
        )}

        {/* Dashboard */}
        <div className="anim-3">
          <HomeDashboard
            initialSummary={summary}
            rounds={rounds}
            defaultRoundId={round ? round.id : (rounds.length > 0 ? rounds[0].id : 0)}
            theme={theme}
          />
        </div>

        {/* Footer */}
        <div className="mt-5 text-center">
          <Link href="/admin/login" className="t-muted small text-decoration-none" style={{ opacity: 0.45 }}>
            <i className="bi bi-shield-lock me-1"></i>ผู้ดูแลระบบ
          </Link>
        </div>

      </div>
    </div>
  )
}
