'use client';

import { useEffect } from 'react';

export default function ReceiptPrintButton() {
    return (
        <button
            className="btn btn-primary d-print-none"
            onClick={() => window.print()}
        >
            <i className="bi bi-printer me-2"></i>พิมพ์ใบเสร็จ
        </button>
    );
}
