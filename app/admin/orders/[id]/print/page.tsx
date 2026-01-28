import { PrismaClient } from '@prisma/client';
import { notFound } from 'next/navigation';
import PrintButton from '@/app/admin/components/PrintButton';

const prisma = new PrismaClient();

export default async function PrintOrderPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const orderId = parseInt(params.id);

    if (isNaN(orderId)) return notFound();

    const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
            member: {
                include: { group: true }
            },
            items: {
                include: { product: true }
            },
            round: true
        }
    });

    if (!order) return notFound();

    return (
        <div className="container-fluid bg-white min-vh-100 p-4">
            <div className="mx-auto border p-4" style={{ maxWidth: '210mm', minHeight: '297mm', paddingTop: '3cm' }}>
                {/* Header */}
                <div className="text-center mb-5">
                    <h3 className="fw-bold m-0">ใบเสร็จรับเงิน / ใบส่งของ</h3>
                    <p className="text-muted">สวัสดิการสำนักวิทยาการสารสนเทศ สำนักงานศาลปกครอง</p>
                </div>

                <div className="row mb-4">
                    <div className="col-6">
                        <strong className="d-block">ลูกค้า:</strong>
                        <div>{order.member.name}</div>
                        <div>{order.member.group.name}</div>
                    </div>
                    <div className="col-6 text-end">
                        <strong className="d-block">เลขที่ใบสั่งซื้อ: #{order.id}</strong>
                        <div>วันที่: {new Date(order.createdAt).toLocaleDateString('th-TH')}</div>
                        <div>รอบ: {order.round ? order.round.roundName : '-'}</div>
                    </div>
                </div>

                {/* Items Table */}
                <table className="table table-bordered mb-4">
                    <thead className="table-light text-center">
                        <tr>
                            <th style={{ width: '50px' }}>#</th>
                            <th>รายการสินค้า</th>
                            <th style={{ width: '100px' }}>ราคา/หน่วย</th>
                            <th style={{ width: '80px' }}>จำนวน</th>
                            <th style={{ width: '100px' }}>รวมเงิน</th>
                        </tr>
                    </thead>
                    <tbody>
                        {order.items.map((item, index) => (
                            <tr key={item.id}>
                                <td className="text-center">{index + 1}</td>
                                <td>{item.product.name}</td>
                                <td className="text-end">฿{item.price.toLocaleString()}</td>
                                <td className="text-center">{item.quantity}</td>
                                <td className="text-end">฿{(item.price * item.quantity).toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colSpan={4} className="text-end fw-bold">รวมเป็นเงินทั้งสิ้น</td>
                            <td className="text-end fw-bold bg-light">฿{order.total.toLocaleString()}</td>
                        </tr>
                    </tfoot>
                </table>

                {/* Footer / Signatures */}
                <div className="row mt-5 pt-5">
                    <div className="col-6 text-center">
                        <div className="border-top border-dark w-75 mx-auto pt-2">
                            ผู้รับของ
                        </div>
                    </div>
                    <div className="col-6 text-center">
                        <div className="border-top border-dark w-75 mx-auto pt-2">
                            ผู้รับเงิน / ผู้ส่งของ
                        </div>
                    </div>
                </div>

                {/* Print Button (Hide when printing) */}
                <div className="text-center mt-5 d-print-none">
                    <PrintButton />
                    <div className="mt-2 text-muted small">
                        * กด Command/Ctrl + P เพื่อพิมพ์
                    </div>
                </div>

                {/* Auto print script */}
                <script dangerouslySetInnerHTML={{
                    __html: `
                    // Optional: window.print(); 
                 `}} />
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    @page { margin: 0; size: A4; }
                    body { background: white; }
                    .container-fluid { padding: 0 !important; }
                    .border { border: none !important; }
                    .d-print-none { display: none !important; }
                }
            `}} />
        </div>
    );
}
