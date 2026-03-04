'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
    id: number;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType) => void;
    success: (message: string) => void;
    error: (message: string) => void;
    info: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const removeToast = useCallback((id: number) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const showToast = useCallback((message: string, type: ToastType = 'info') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        // Timeout removed as per user request to stay until OK is clicked
    }, []);

    const success = useCallback((msg: string) => showToast(msg, 'success'), [showToast]);
    const error = useCallback((msg: string) => showToast(msg, 'error'), [showToast]);
    const info = useCallback((msg: string) => showToast(msg, 'info'), [showToast]);

    return (
        <ToastContext.Provider value={{ showToast, success, error, info }}>
            {children}
            <div className="toast-container position-fixed top-0 end-0 p-4" style={{ zIndex: 2000 }}>
                {toasts.map(toast => (
                    <div
                        key={toast.id}
                        className="mb-3 animate-slide-left"
                        style={{
                            minWidth: '320px',
                            maxWidth: '450px',
                            background: 'rgba(255, 255, 255, 0.9)',
                            backdropFilter: 'blur(16px)',
                            WebkitBackdropFilter: 'blur(16px)',
                            borderRadius: '16px',
                            boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
                            border: '1px solid rgba(255,255,255,0.4)',
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                            pointerEvents: 'auto', // Ensure clicks are received
                            position: 'relative',
                            zIndex: 2001
                        }}
                    >
                        <div style={{
                            padding: '1.25rem',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '12px'
                        }}>
                            <div style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1.2rem',
                                color: 'white',
                                flexShrink: 0,
                                background: toast.type === 'success'
                                    ? 'linear-gradient(135deg, #10b981, #059669)'
                                    : toast.type === 'error'
                                        ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                                        : 'linear-gradient(135deg, #3b82f6, #2563eb)'
                            }}>
                                <i className={`bi bi-${toast.type === 'success' ? 'check2-circle' : toast.type === 'error' ? 'exclamation-triangle' : 'info-circle'}`}></i>
                            </div>
                            <div style={{ flex: 1, color: '#1f2937', fontSize: '0.95rem', fontWeight: 500, lineHeight: '1.4' }}>
                                {toast.message}
                            </div>
                        </div>
                        <div style={{
                            padding: '0.75rem 1.25rem',
                            background: 'rgba(0,0,0,0.03)',
                            borderTop: '1px solid rgba(0,0,0,0.05)',
                            display: 'flex',
                            justifyContent: 'flex-end',
                            pointerEvents: 'auto'
                        }}>
                            <button
                                type="button"
                                className="btn btn-sm"
                                style={{
                                    padding: '6px 20px',
                                    borderRadius: '8px',
                                    fontWeight: 600,
                                    fontSize: '0.85rem',
                                    background: toast.type === 'success' ? '#10b981' : toast.type === 'error' ? '#ef4444' : '#3b82f6',
                                    color: 'white',
                                    transition: 'all 0.2s ease',
                                    border: 'none',
                                    boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
                                    cursor: 'pointer' // Explicitly set cursor
                                }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    removeToast(toast.id);
                                }}
                                onMouseOver={(e) => (e.currentTarget.style.opacity = '0.85')}
                                onMouseOut={(e) => (e.currentTarget.style.opacity = '1')}
                            >
                                ตกลง (OK)
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (context === undefined) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}
