import type { ToastType } from '../components/Toast';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
}

type Subscriber = (toasts: ToastMessage[]) => void;

class ToastManager {
  private toasts: ToastMessage[] = [];
  private subscribers: Set<Subscriber> = new Set();
  private maxToasts = 3;

  subscribe(callback: Subscriber): () => void {
    this.subscribers.add(callback);
    callback(this.toasts);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  private notify() {
    this.subscribers.forEach((callback) => callback([...this.toasts]));
  }

  show(message: string, type: ToastType = 'info', duration: number = 4000): string {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const newToast: ToastMessage = {
      id,
      message,
      type,
      duration
    };

    // Add to beginning and limit to maxToasts
    this.toasts = [newToast, ...this.toasts].slice(0, this.maxToasts);
    this.notify();

    return id;
  }

  dismiss(id: string) {
    this.toasts = this.toasts.filter((toast) => toast.id !== id);
    this.notify();
  }

  dismissAll() {
    this.toasts = [];
    this.notify();
  }

  // Convenience methods
  success(message: string, duration?: number) {
    return this.show(message, 'success', duration);
  }

  error(message: string, duration?: number) {
    return this.show(message, 'error', duration);
  }

  warning(message: string, duration?: number) {
    return this.show(message, 'warning', duration);
  }

  info(message: string, duration?: number) {
    return this.show(message, 'info', duration);
  }
}

export const toastManager = new ToastManager();
