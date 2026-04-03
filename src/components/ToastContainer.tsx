import React, { useEffect, useState } from 'react';
import Toast from './Toast';
import { toastManager } from '../utils/toastManager';
import type { ToastMessage } from '../utils/toastManager';

const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const unsubscribe = toastManager.subscribe(setToasts);
    return unsubscribe;
  }, []);

  const handleClose = (id: string) => {
    toastManager.dismiss(id);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end pointer-events-none">
      <div className="flex flex-col-reverse gap-2 pointer-events-auto">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            id={toast.id}
            message={toast.message}
            type={toast.type}
            duration={toast.duration}
            onClose={handleClose}
          />
        ))}
      </div>
    </div>
  );
};

export default ToastContainer;
