// src/app/services/toast.service.ts
import { Injectable, signal, computed } from '@angular/core';

// ============================================
// TYPES
// ============================================
export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
  createdAt: number;
}

interface ToastOptions {
  duration?: number;
  unique?: boolean; // Prevent duplicate messages
}

// ============================================
// SERVICE
// ============================================
@Injectable({
  providedIn: 'root'
})
export class ToastService {
  // State
  private readonly _toasts = signal<Toast[]>([]);
  
  // Public readonly
  readonly toasts = this._toasts.asReadonly();
  
  // Computed
  readonly hasToasts = computed(() => this._toasts().length > 0);
  readonly toastCount = computed(() => this._toasts().length);

  // Default durations per type (ms)
  private readonly defaultDurations: Record<ToastType, number> = {
    success: 3000,
    error: 5000,
    warning: 4000,
    info: 3000
  };

  // Max toasts shown at once
  private readonly maxToasts = 5;

  // Track recent messages to prevent duplicates
  private readonly recentMessages = new Map<string, number>();
  private readonly duplicateWindow = 2000; // 2 seconds

  // ============================================
  // PUBLIC METHODS
  // ============================================

  /**
   * Show success toast
   */
  success(message: string, options?: ToastOptions): string {
    return this.show('success', message, options);
  }

  /**
   * Show error toast
   */
  error(message: string, options?: ToastOptions): string {
    return this.show('error', message, { duration: 5000, ...options });
  }

  /**
   * Show warning toast
   */
  warning(message: string, options?: ToastOptions): string {
    return this.show('warning', message, options);
  }

  /**
   * Show info toast
   */
  info(message: string, options?: ToastOptions): string {
    return this.show('info', message, options);
  }

  /**
   * Show toast with custom type
   */
  show(type: ToastType, message: string, options?: ToastOptions): string {
    // Check for duplicate
    if (options?.unique !== false && this.isDuplicate(message)) {
      return '';
    }

    // Generate ID
    const id = this.generateId();
    const duration = options?.duration ?? this.defaultDurations[type];

    // Create toast
    const toast: Toast = {
      id,
      type,
      message,
      duration,
      createdAt: Date.now()
    };

    // Add to list (limit max toasts)
    this._toasts.update(toasts => {
      const updated = [toast, ...toasts];
      return updated.slice(0, this.maxToasts);
    });

    // Track message
    this.recentMessages.set(message, Date.now());

    // Auto dismiss
    if (duration > 0) {
      setTimeout(() => this.dismiss(id), duration);
    }

    // Cleanup old message tracking
    this.cleanupRecentMessages();

    return id;
  }

  /**
   * Dismiss a specific toast
   */
  dismiss(id: string): void {
    this._toasts.update(toasts => toasts.filter(t => t.id !== id));
  }

  /**
   * Dismiss all toasts
   */
  dismissAll(): void {
    this._toasts.set([]);
  }

  /**
   * Dismiss toasts by type
   */
  dismissByType(type: ToastType): void {
    this._toasts.update(toasts => toasts.filter(t => t.type !== type));
  }

  /**
   * Update a toast message
   */
  update(id: string, message: string, type?: ToastType): void {
    this._toasts.update(toasts =>
      toasts.map(t => {
        if (t.id === id) {
          return { ...t, message, type: type ?? t.type };
        }
        return t;
      })
    );
  }

  // ============================================
  // CONVENIENCE METHODS
  // ============================================

  /**
   * Show loading toast that returns dismiss function
   */
  loading(message: string = 'Laden...'): () => void {
    const id = this.show('info', message, { duration: 0 });
    return () => this.dismiss(id);
  }

  /**
   * Promise-based toast: shows loading, then success/error
   */
  async promise<T>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((err: any) => string);
    }
  ): Promise<T> {
    const id = this.show('info', messages.loading, { duration: 0 });

    try {
      const result = await promise;
      this.dismiss(id);
      const successMsg = typeof messages.success === 'function'
        ? messages.success(result)
        : messages.success;
      this.success(successMsg);
      return result;
    } catch (err) {
      this.dismiss(id);
      const errorMsg = typeof messages.error === 'function'
        ? messages.error(err)
        : messages.error;
      this.error(errorMsg);
      throw err;
    }
  }

  /**
   * Show API error with fallback message
   */
  apiError(error: any, fallback: string = 'Ein Fehler ist aufgetreten'): string {
    const message = error?.error?.message 
      || error?.error?.error 
      || error?.message 
      || fallback;
    return this.error(message);
  }

  /**
   * Show confirmation toast with action
   */
  confirm(
    message: string,
    onConfirm: () => void,
    options?: { confirmText?: string; cancelText?: string }
  ): string {
    // For now, just show info toast
    // In a full implementation, this would show a toast with buttons
    return this.info(message);
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  private generateId(): string {
    return `toast_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private isDuplicate(message: string): boolean {
    const lastShown = this.recentMessages.get(message);
    if (!lastShown) return false;
    return Date.now() - lastShown < this.duplicateWindow;
  }

  private cleanupRecentMessages(): void {
    const now = Date.now();
    this.recentMessages.forEach((timestamp, message) => {
      if (now - timestamp > this.duplicateWindow * 2) {
        this.recentMessages.delete(message);
      }
    });
  }
}