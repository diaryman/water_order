import { getTodaySummary, getCurrentRound } from '@/app/actions'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const round = await getCurrentRound()
  const summary = await getTodaySummary()

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

      {/* Daily Summary Section */}
      <div className="row g-4 mb-5">
        <div className="col-12">
          <h3 className="fw-bold mb-4 text-primary text-center">สรุปยอดคำสั่งซื้อรอบวันนี้</h3>
        </div>
        <div className="col-md-6">
          <div className="card card-custom p-4 text-center border-0 shadow-sm h-100" style={{ background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)' }}>
            <i className="bi bi-droplet-fill text-primary display-3 mb-3"></i>
            <h2 className="fw-bold display-4">{summary.totalSmall}</h2>
            <p className="text-muted fw-bold mb-0">น้ำแพ็คเล็ก (ขวด)</p>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card card-custom p-4 text-center border-0 shadow-sm h-100" style={{ background: 'linear-gradient(135deg, #e1f5fe 0%, #b3e5fc 100%)' }}>
            <i className="bi bi-bucket-fill text-info display-3 mb-3"></i>
            <h2 className="fw-bold display-4">{summary.totalLarge}</h2>
            <p className="text-muted fw-bold mb-0">น้ำแพ็คใหญ่ (ขวด)</p>
          </div>
        </div>
      </div>

      {/* Recent Orders Table (Simple) */}
      <div className="card card-custom border-0 shadow-sm overflow-hidden bg-white">
        <div className="card-header bg-white border-0 py-3">
          <h5 className="fw-bold mb-0"><i className="bi bi-clock-history me-2 text-warning"></i> รายการสั่งซื้อล่าสุด</h5>
        </div>
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0 small">
            <thead className="table-light">
              <tr>
                <th className="ps-4">ชื่อผู้สั่ง</th>
                <th>รายการ</th>
                <th className="text-end pe-4">สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {summary.orders.slice(0, 5).map(order => (
                <tr key={order.id}>
                  <td className="ps-4">
                    <div className="fw-bold">{order.member.name}</div>
                    <div className="smallest text-muted">{order.member.group.name}</div>
                  </td>
                  <td>
                    {order.items.map(it => `${it.product.name} x${it.quantity}`).join(', ')}
                  </td>
                  <td className="text-end pe-4">
                    <span className={`badge rounded-pill ${order.status === 'PENDING' ? 'bg-warning text-dark' :
                      order.status === 'PAID' ? 'bg-info text-white' : 'bg-success'
                      }`} style={{ fontSize: '0.65rem' }}>
                      {order.status === 'PENDING' ? 'รอตรวจสอบ' :
                        order.status === 'PAID' ? 'ชำระแล้ว' : 'สำเร็จ'}
                    </span>
                  </td>
                </tr>
              ))}
              {summary.orders.length === 0 && (
                <tr><td colSpan={3} className="text-center py-4 text-muted small">ยังไม่มีรายการสั่งซื้อในรอบนี้</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Admin Footer */}
      <div className="mt-5 text-center">
        <Link href="/admin/login" className="text-muted small text-decoration-none opacity-50 hover-opacity-100">
          <i className="bi bi-shield-lock me-1"></i> สำหรับผู้ดูแลระบบ
        </Link>
      </div>
    </div>
  )
}

