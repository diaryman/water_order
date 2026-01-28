import { AuditLog } from '@prisma/client'
import Link from 'next/link';
import { getAuditLogs } from '@/app/admin/actions';
import SearchFilter from '@/app/admin/components/SearchFilter';

export default async function AdminLogsPage(props: {
    searchParams?: Promise<{ search?: string; date?: string }>;
}) {
    const searchParams = await props.searchParams;
    const search = searchParams?.search;
    const date = searchParams?.date;

    const logs = await getAuditLogs(search, date);

    return (
        <div className="container py-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h3 className="fw-bold mb-0">
                    <i className="bi bi-journal-text me-2"></i>
                    บันทึกกิจกรรม (Audit Logs)
                </h3>
                <Link href="/admin/dashboard" className="btn btn-outline-secondary">
                    <i className="bi bi-arrow-left me-2"></i>กลับหน้าหลัก
                </Link>
            </div>

            <SearchFilter showDate={true} placeholder="ค้นหากิจกรรม, รายละเอียด, IP..." />

            <div className="card shadow-sm border-0">
                <div className="card-body p-0">
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                            <thead className="bg-light">
                                <tr>
                                    <th className="py-3 ps-3">เวลา</th>
                                    <th className="py-3">กิจกรรม (Action)</th>
                                    <th className="py-3">รายละเอียด</th>
                                    <th className="py-3">IP Address</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.length > 0 ? (
                                    logs.map((log: AuditLog) => (
                                        <tr key={log.id}>
                                            <td className="ps-3 text-nowrap text-secondary">
                                                {new Date(log.createdAt).toLocaleString('th-TH')}
                                            </td>
                                            <td>
                                                <span className={`badge rounded-pill ${log.action === 'LOGIN' ? 'bg-success' :
                                                        log.action.includes('CREATE') ? 'bg-primary' :
                                                            log.action.includes('UPDATE') ? 'bg-warning text-dark' :
                                                                log.action.includes('DELETE') ? 'bg-danger' :
                                                                    'bg-secondary'
                                                    }`}>
                                                    {log.action}
                                                </span>
                                            </td>
                                            <td className="text-muted">{log.details}</td>
                                            <td><small className="font-monospace text-muted">{log.ip}</small></td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={4} className="text-center py-5 text-muted">
                                            <i className="bi bi-inbox display-1 d-block mb-3 text-light"></i>
                                            ยังไม่มีข้อมูลการบันทึก
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
