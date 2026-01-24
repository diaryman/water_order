"use client"

import React, { createContext, useContext, useState, useCallback } from 'react'

type ToastType = 'success' | 'error' | 'info'

interface Toast {
    id: number
    message: string
    type: ToastType
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([])

    const showToast = useCallback((message: string, type: ToastType = 'info') => {
        const id = Date.now()
        setToasts(prev => [...prev, { id, message, type }])

        // Auto remove after 3 seconds
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id))
        }, 3000)
    }, [])

    const removeToast = (id: number) => {
        setToasts(prev => prev.filter(t => t.id !== id))
    }

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div className="toast-container position-fixed top-0 end-0 p-3" style={{ zIndex: 1060 }}>
                {toasts.map(toast => (
                    <div
                        key={toast.id}
                        className={`toast show align-items-center text-white bg-${toast.type === 'success' ? 'success' : toast.type === 'error' ? 'danger' : 'primary'} border-0 mb-2 shadow`}
                        role="alert"
                        aria-live="assertive"
                        aria-atomic="true"
                    >
                        <div className="d-flex">
                            <div className="toast-body">
                                {toast.type === 'success' && <i className="bi bi-check-circle-fill me-2"></i>}
                                {toast.type === 'error' && <i className="bi bi-exclamation-triangle-fill me-2"></i>}
                                {toast.type === 'info' && <i className="bi bi-info-circle-fill me-2"></i>}
                                {toast.message}
                            </div>
                            <button type="button" className="btn-close btn-close-white me-2 m-auto" onClick={() => removeToast(toast.id)} aria-label="Close"></button>
                        </div>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    )
}

export function useToast() {
    const context = useContext(ToastContext)
    if (context === undefined) {
        throw new Error('useToast must be used within a ToastProvider')
    }
    return context
}
