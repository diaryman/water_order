import type { Metadata } from "next";
import { Prompt } from "next/font/google";
import "bootstrap/dist/css/bootstrap.min.css";
import "./globals.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import BootstrapClient from "./components/BootstrapClient";

import { ToastProvider } from "./components/ToastProvider";

const prompt = Prompt({
  weight: ['300', '400', '500', '700'],
  subsets: ["latin", "thai"],
  variable: "--font-prompt",
});

export const metadata: Metadata = {
  title: "ระบบสั่งซื้อน้ำดื่ม (Water2)",
  description: "ระบบสั่งซื้อน้ำดื่มสำหรับสำนักงาน",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body className={prompt.className}>
        <ToastProvider>
          {children}
        </ToastProvider>
        <BootstrapClient />
      </body>
    </html>
  );
}
