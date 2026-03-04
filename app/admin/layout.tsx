import { logout } from './actions';
import Link from 'next/link';
import { Prompt } from "next/font/google";

const prompt = Prompt({
    weight: ['300', '400', '500', '700'],
    subsets: ["latin", "thai"],
    variable: "--font-prompt",
});

export default function AdminLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <div className={`${prompt.variable} font-sans min-vh-100 bg-light`}>
            <nav className="navbar navbar-expand-lg navbar-dark bg-primary shadow-sm mb-4">
                <div className="container">
                    <Link className="navbar-brand fw-bold" href="/admin/dashboard">
                        <i className="bi bi-water me-2"></i>Water2 Admin
                    </Link>
                    <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#adminNav">
                        <span className="navbar-toggler-icon"></span>
                    </button>

                    <div className="collapse navbar-collapse" id="adminNav">
                        <ul className="navbar-nav me-auto mb-2 mb-lg-0">
                            <li className="nav-item">
                                <Link className="nav-link" href="/admin/dashboard">ภาพรวม</Link>
                            </li>
                            <li className="nav-item">
                                <Link className="nav-link" href="/admin/members">จัดการสมาชิก</Link>
                            </li>
                            <li className="nav-item">
                                <Link className="nav-link" href="/admin/products">สินค้า</Link>
                            </li>
                            <li className="nav-item">
                                <Link className="nav-link" href="/admin/rounds">จัดการรอบสั่งซื้อ</Link>
                            </li>
                            <li className="nav-item">
                                <Link className="nav-link" href="/admin/payments">การชำระเงิน</Link>
                            </li>
                            <li className="nav-item">
                                <Link className="nav-link" href="/admin/orders">คำสั่งซื้อ</Link>
                            </li>
                            <li className="nav-item">
                                <Link className="nav-link" href="/admin/settings"><i className="bi bi-palette me-1"></i>ธีม</Link>
                            </li>
                        </ul>
                        <form action={logout}>
                            <button className="btn btn-outline-light btn-sm rounded-pill px-3">
                                <i className="bi bi-box-arrow-right me-2"></i>ออกจากระบบ
                            </button>
                        </form>
                    </div>
                </div>
            </nav>

            <main>
                {children}
            </main>
        </div>
    );
}
