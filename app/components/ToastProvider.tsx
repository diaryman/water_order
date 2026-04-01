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

        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 7000);
    }, []);

    const success = useCallback((msg: string) => showToast(msg, 'success'), [showToast]);
    const error = useCallback((msg: string) => showToast(msg, 'error'), [showToast]);
    const info = useCallback((msg: string) => showToast(msg, 'info'), [showToast]);

    return (
        <ToastContext.Provider value={{ showToast, success, error, info }}>
            {children}
            <style>{`
                @keyframes slideInRight {
                    from { transform: translateX(120%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes shrinkWidth {
                    from { width: 100%; }
                    to { width: 0%; }
                }
                .toast-modern {
                    animation: slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                .toast-progress-bar {
                    height: 4px;
                    background: rgba(0,0,0,0.15);
                    width: 100%;
                    transform-origin: left;
                    animation: shrinkWidth 7s linear forwards;
                }
            `}</style>
            <div className="toast-container position-fixed top-0 end-0 p-4" style={{ zIndex: 2000 }}>
                {toasts.map(toast => (
                    <div
                        key={toast.id}
                        className="mb-3 toast-modern"
                        style={{
                            minWidth: '320px',
                            maxWidth: '450px',
                            background: 'rgba(255, 255, 255, 0.95)',
                            backdropFilter: 'blur(20px)',
                            WebkitBackdropFilter: 'blur(20px)',
                            borderRadius: '16px',
                            boxShadow: '0 15px 35px rgba(0,0,0,0.15), 0 5px 15px rgba(0,0,0,0.05)',
                            border: '1px solid rgba(255,255,255,0.8)',
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                            pointerEvents: 'auto',
                            position: 'relative',
                            zIndex: 2001,
                            transform: 'translateZ(0)'
                        }}
                    >
                        <div style={{
                            padding: '1.25rem 1.25rem 1rem 1.25rem',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '14px'
                        }}>
                            <div style={{
                                width: '42px',
                                height: '42px',
                                borderRadius: '14px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1.4rem',
                                color: 'white',
                                flexShrink: 0,
                                background: toast.type === 'success'
                                    ? 'linear-gradient(135deg, #10b981, #34d399)'
                                    : toast.type === 'error'
                                        ? 'linear-gradient(135deg, #ef4444, #f87171)'
                                        : 'linear-gradient(135deg, #3b82f6, #60a5fa)',
                                boxShadow: toast.type === 'success'
                                    ? '0 4px 12px rgba(16, 185, 129, 0.3)'
                                    : toast.type === 'error'
                                        ? '0 4px 12px rgba(239, 68, 68, 0.3)'
                                        : '0 4px 12px rgba(59, 130, 246, 0.3)'
                            }}>
                                <i className={`bi bi-${toast.type === 'success' ? 'check-lg' : toast.type === 'error' ? 'exclamation-lg' : 'info-lg'}`}></i>
                            </div>
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                <div style={{
                                    color: '#111827',
                                    fontSize: '1.05rem',
                                    fontWeight: 700,
                                    marginBottom: '4px',
                                    letterSpacing: '-0.3px'
                                }}>
                                    {toast.type === 'success' ? 'สำเร็จ' : toast.type === 'error' ? 'เกิดข้อผิดพลาด' : 'แจ้งเตือน'}
                                </div>
                                <div style={{ color: '#4b5563', fontSize: '0.9rem', fontWeight: 400, lineHeight: '1.5' }}>
                                    {toast.message}
                                </div>
                            </div>
                            <button
                                type="button"
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#9ca3af',
                                    padding: '4px',
                                    cursor: 'pointer',
                                    fontSize: '1.2rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: '50%',
                                    transition: 'background 0.2s ease, color 0.2s ease'
                                }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    removeToast(toast.id);
                                }}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.background = 'rgba(0,0,0,0.05)';
                                    e.currentTarget.style.color = '#4b5563';
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.background = 'transparent';
                                    e.currentTarget.style.color = '#9ca3af';
                                }}
                            >
                                <i className="bi bi-x"></i>
                            </button>
                        </div>
                        <div className="toast-progress-bar" style={{
                            background: toast.type === 'success' ? '#10b981' : toast.type === 'error' ? '#ef4444' : '#3b82f6'
                        }}></div>
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
