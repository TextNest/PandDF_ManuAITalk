'use client';

import { useToastStore } from '@/store/useToastStore';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import styles from './Toast.module.css';

export default function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle size={20} />;
      case 'error':
        return <XCircle size={20} />;
      case 'warning':
        return <AlertTriangle size={20} />;
      case 'info':
        return <Info size={20} />;
      default:
        return null;
    }
  };

  if (toasts.length === 0) return null;

  return (
    <div className={styles.toastContainer}>
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`${styles.toast} ${styles[toast.type]}`}
        >
          <div className={styles.toastIcon}>
            {getIcon(toast.type)}
          </div>
          <p className={styles.toastMessage}>{toast.message}</p>
          <button
            className={styles.closeButton}
            onClick={() => removeToast(toast.id)}
            aria-label="닫기"
          >
            <X size={18} />
          </button>
        </div>
      ))}
    </div>
  );
}