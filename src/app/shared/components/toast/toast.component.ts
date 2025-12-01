// src/app/shared/components/toast/toast.component.ts
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, Toast } from '../../../services/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed top-4 right-4 z-[100] space-y-2 max-w-sm w-full px-4 pt-safe-top pointer-events-none">
      @for (toast of toastService.toasts(); track toast.id) {
        <div 
          class="pointer-events-auto flex items-start gap-3 p-4 rounded-2xl shadow-2xl border backdrop-blur-lg"
          [class]="getToastClasses(toast.type)"
          [@slideIn]>
          
          <!-- Icon -->
          <div class="flex-shrink-0 mt-0.5">
            @switch (toast.type) {
              @case ('success') {
                <div class="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
                  </svg>
                </div>
              }
              @case ('error') {
                <div class="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                  <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </div>
              }
              @case ('warning') {
                <div class="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center">
                  <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 9v2m0 4h.01"/>
                  </svg>
                </div>
              }
              @default {
                <div class="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                  <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 16h-1v-4h-1m1-4h.01"/>
                  </svg>
                </div>
              }
            }
          </div>

          <!-- Content -->
          <div class="flex-1 min-w-0">
            <p class="text-sm text-white font-medium">{{ toast.message }}</p>
            
            <!-- Progress bar -->
            @if (toast.duration > 0) {
              <div class="mt-2 h-0.5 bg-white/10 rounded-full overflow-hidden">
                <div 
                  class="h-full rounded-full transition-all ease-linear"
                  [class.bg-green-400]="toast.type === 'success'"
                  [class.bg-red-400]="toast.type === 'error'"
                  [class.bg-yellow-400]="toast.type === 'warning'"
                  [class.bg-blue-400]="toast.type === 'info'"
                  [style.animation]="'shrink ' + toast.duration + 'ms linear forwards'">
                </div>
              </div>
            }
          </div>

          <!-- Close -->
          <button 
            (click)="dismiss(toast.id)"
            class="flex-shrink-0 p-1 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    @keyframes shrink {
      from { width: 100%; }
      to { width: 0%; }
    }

    @keyframes slideIn {
      from {
        transform: translateX(100%) scale(0.9);
        opacity: 0;
      }
      to {
        transform: translateX(0) scale(1);
        opacity: 1;
      }
    }

    :host {
      display: contents;
    }
  `]
})
export class ToastContainerComponent {
  readonly toastService = inject(ToastService);

  getToastClasses(type: string): string {
    const base = 'animate-[slideIn_0.3s_ease-out]';
    
    switch (type) {
      case 'success':
        return `${base} bg-[#1c1c2e]/95 border-green-500/30`;
      case 'error':
        return `${base} bg-[#1c1c2e]/95 border-red-500/30`;
      case 'warning':
        return `${base} bg-[#1c1c2e]/95 border-yellow-500/30`;
      case 'info':
      default:
        return `${base} bg-[#1c1c2e]/95 border-blue-500/30`;
    }
  }

  dismiss(id: string): void {
    this.toastService.dismiss(id);
  }
}