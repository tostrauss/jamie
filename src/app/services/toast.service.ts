import { Injectable, signal } from '@angular/core';
import { Toast } from '../models/types';

@Injectable({ providedIn: 'root' })
export class ToastService {
  toasts = signal<Toast[]>([]);

  show(message: string, type: 'success' | 'error' | 'info' = 'success') {
    const id = crypto.randomUUID();
    const newToast: Toast = { id, message, type };
    
    this.toasts.update(list => [...list, newToast]);

    // Automatisch entfernen nach 3 Sekunden
    setTimeout(() => {
      this.remove(id);
    }, 3000);
  }

  remove(id: string) {
    this.toasts.update(list => list.filter(t => t.id !== id));
  }
}