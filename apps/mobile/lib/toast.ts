export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastConfig {
  id: string;
  message: string;
  type: ToastType;
}

type ToastListener = (toast: ToastConfig) => void;

const listeners: ToastListener[] = [];

function subscribe(fn: ToastListener): () => void {
  listeners.push(fn);
  return () => {
    const i = listeners.indexOf(fn);
    if (i !== -1) listeners.splice(i, 1);
  };
}

function emit(message: string, type: ToastType) {
  const toastMsg: ToastConfig = { id: Date.now().toString(), message, type };
  listeners.forEach((fn) => fn(toastMsg));
}

export const toast = {
  show: (message: string, type: ToastType = 'info') => emit(message, type),
  success: (message: string) => emit(message, 'success'),
  error: (message: string) => emit(message, 'error'),
  info: (message: string) => emit(message, 'info'),
  warning: (message: string) => emit(message, 'warning'),
  subscribe,
};
