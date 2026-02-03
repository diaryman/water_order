import { getOrder } from '@/app/receipt/actions';
import ReceiptPrintButton from '@/app/receipt/components/ReceiptPrintButton';
import Link from 'next/link';

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const order = await getOrder(Number(id));

    if (!order) {
        return <div className="p-5 text-center text-danger">ไม่พบคำสั่งซื้อ</div>;
    }

    if (order.status !== 'PAID') {
        return (
            <div className="container py-5 text-center">
                <div className="alert alert-warning shadow-sm border-0 app-card">
                    <h4 className="alert-heading fw-bold"><i className="bi bi-exclamation-triangle me-2"></i>ไม่สามารถออกใบเสร็จได้</h4>
                    <p className="mb-0">คำสั่งซื้อนี้ยังไม่ได้รับการยืนยันการชำระเงินจากเจ้าหน้าที่</p>
                    <hr />
                    <Link href="/" className="btn btn-primary mt-2">กลับหน้าหลัก</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-vh-100 bg-light py-5">
            <div className="container" style={{ maxWidth: '800px' }}>
                {/* Controls */}
                <div className="d-flex justify-content-between align-items-center mb-4 d-print-none">
                    <Link href="/" className="btn btn-outline-secondary">
                        <i className="bi bi-arrow-left me-2"></i>กลับหน้าหลัก
                    </Link>
                    <ReceiptPrintButton />
                </div>

                {/* Receipt Paper */}
                <div className="card border-0 shadow-sm p-5 bg-white position-relative overflow-hidden">
                    {/* Watermark/Decor */}
                    <div className="position-absolute top-0 start-0 w-100 h-2 bg-primary"></div>

                    {/* Header */}
                    <div className="text-center mb-5">
                        <div className="mb-3">
                            <i className="bi bi-droplet-fill text-primary display-4"></i>
                        </div>
                        <h2 className="fw-bold text-primary mb-1">ใบเสร็จรับเงิน</h2>
                        <h5 className="text-muted">RECEIPT</h5>
                        <p className="text-muted small mt-2">
                            สวัสดิการสำนักวิทยาการสารสนเทศ สำนักงานศาลปกครอง
                        </p>
                    </div>

                    <div className="row mb-4">
                        <div className="col-6">
                            <h6 className="fw-bold text-secondary text-uppercase small">ข้อมูลผู้สั่ง (Customer)</h6>
                            <p className="fw-bold mb-0 text-dark">{order.member.name}</p>
                            <p className="text-muted small mb-0">{order.member.group.name}</p>
                        </div>
                        <div className="col-6 text-end">
                            <h6 className="fw-bold text-secondary text-uppercase small">เลขที่ใบเสร็จ (Receipt No)</h6>
                            <p className="fw-bold mb-0 text-dark">RC-{order.id.toString().padStart(6, '0')}</p>
                            <p className="text-muted small mb-0">วันที่: {new Date(order.createdAt).toLocaleDateString("th-TH")}</p>
                            <p className="text-muted small mb-0">รอบ: {order.round ? order.round.roundName : '-'}</p>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="table-responsive mb-4">
                        <table className="table table-bordered border-light table-striped">
                            <thead className="table-primary text-center">
                                <tr>
                                    <th style={{ width: '10%' }}>#</th>
                                    <th className="text-start">รายการ (Description)</th>
                                    <th style={{ width: '15%' }}>จำนวน (Qty)</th>
                                    <th style={{ width: '20%' }}>ราคา (@Price)</th>
                                    <th style={{ width: '20%' }}>รวม (Total)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {order.items.map((item, index) => (
                                    <tr key={index}>
                                        <td className="text-center">{index + 1}</td>
                                        <td>{item.product.name}</td>
                                        <td className="text-center">{item.quantity}</td>
                                        <td className="text-end">{item.price.toLocaleString()}</td>
                                        <td className="text-end">{(item.quantity * item.price).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="table-light">
                                <tr>
                                    <td colSpan={4} className="text-end fw-bold">ยอดรวมสุทธิ (Grand Total)</td>
                                    <td className="text-end fw-bold text-primary fs-5">฿{order.total.toLocaleString()}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    {/* Payment Info */}
                    <div className="border rounded p-3 bg-light mb-5">
                        <div className="d-flex align-items-center">
                            <i className="bi bi-check-circle-fill text-success fs-3 me-3"></i>
                            <div>
                                <h6 className="fw-bold mb-0 text-success">ชำระเงินเรียบร้อยแล้ว (Paid)</h6>
                                <small className="text-muted">ขอบคุณที่ใช้บริการของเรา</small>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="text-center text-muted small mt-5">
                        <hr />
                        <p className="mb-1">เอกสารนี้เป็นหลักฐานการชำระเงินที่ออกโดยระบบอิเล็กทรอนิกส์</p>
                        <p>© {new Date().getFullYear()} Water Ordering System</p>
                    </div>
                </div>
            </div>

            <style>{`
                @media print {
                    .d-print-none { display: none !important; }
                    .bg-light { background-color: white !important; }
                    .shadow-sm { box-shadow: none !important; }
                    .card { border: none !important; }
                    body { -webkit-print-color-adjust: exact; }
                }
            `}</style>
        </div>
    );
}
