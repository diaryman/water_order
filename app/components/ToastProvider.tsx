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
        setTimeout(() => removeToast(id), 3000);
    }, [removeToast]);

    const success = useCallback((msg: string) => showToast(msg, 'success'), [showToast]);
    const error = useCallback((msg: string) => showToast(msg, 'error'), [showToast]);
    const info = useCallback((msg: string) => showToast(msg, 'info'), [showToast]);

    return (
        <ToastContext.Provider value={{ showToast, success, error, info }}>
            {children}
            <div className="toast-container position-fixed top-0 end-0 p-3" style={{ zIndex: 1100 }}>
                {toasts.map(toast => (
                    <div
                        key={toast.id}
                        className={`toast show align-items-center text-white bg-${toast.type === 'success' ? 'success' : toast.type === 'error' ? 'danger' : 'primary'} border-0 mb-2`}
                        role="alert"
                        aria-live="assertive"
                        aria-atomic="true"
                    >
                        <div className="d-flex">
                            <div className="toast-body">
                                <i className={`bi bi-${toast.type === 'success' ? 'check-circle' : toast.type === 'error' ? 'exclamation-triangle' : 'info-circle'} me-2`}></i>
                                {toast.message}
                            </div>
                            <button
                                type="button"
                                className="btn-close btn-close-white me-2 m-auto"
                                onClick={() => removeToast(toast.id)}
                            ></button>
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
