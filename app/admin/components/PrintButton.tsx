'use client';

export default function PrintButton() {
    return (
        <button
            className="btn btn-primary btn-lg"
            onClick={() => window.print()}
        >
            <i className="bi bi-printer me-2"></i>พิมพ์หน้านี้
        </button>
    );
}
