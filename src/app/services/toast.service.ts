// src/app/services/toast.service.ts
// Jamie App - Toast Notification Service

import { Injectable, signal, computed } from '@angular/core';
import { Toast } from '../models/types';

@Injectable({ 
  providedIn: 'root' 
})
export class ToastService {
  private readonly _toasts = signal<Toast[]>([]);
  
  readonly toasts = this._toasts.asReadonly();
  readonly hasToasts = computed(() => this._toasts().length > 0);

  private readonly defaultDurations = {
    success: 3000,
    error: 5000,
    info: 4000,
    warning: 4000
  };

  show(message: string, type: Toast['type'] = 'success', duration?: number): string {
    const id = crypto.randomUUID();
    const toast: Toast = { 
      id, 
      message, 
      type,
      duration: duration ?? this.defaultDurations[type]
    };
    
    this._toasts.update(list => [...list, toast]);

    if (toast.duration && toast.duration > 0) {
      setTimeout(() => this.remove(id), toast.duration);
    }

    return id;
  }

  success(message: string, duration?: number): string {
    return this.show(message, 'success', duration);
  }

  error(message: string, duration?: number): string {
    return this.show(message, 'error', duration);
  }

  info(message: string, duration?: number): string {
    return this.show(message, 'info', duration);
  }

  warning(message: string, duration?: number): string {
    return this.show(message, 'warning', duration);
  }

  remove(id: string): void {
    this._toasts.update(list => list.filter(t => t.id !== id));
  }

  clear(): void {
    this._toasts.set([]);
  }

  showApiError(error: any, fallback = 'Ein Fehler ist aufgetreten'): string {
    const message = error?.message || error?.error?.error || error?.error || fallback;
    return this.error(message);
  }
}