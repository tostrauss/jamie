// src/app/shared/components/toast/toast.component.ts
// Jamie App - Toast Notification Container Component

import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../../services/toast.service';
import { Toast } from '../../../models/types';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed top-4 right-4 left-4 sm:left-auto z-[100] flex flex-col gap-2 pointer-events-none">
      @for (toast of toastService.toasts(); track toast.id) {
        <div 
          class="pointer-events-auto w-full sm:min-w-[320px] sm:max-w-[400px] p-4 rounded-2xl shadow-2xl border backdrop-blur-md animate-slide-in flex items-start gap-3"
          [class]="getToastClasses(toast)">
          
          <!-- Icon -->
          <div class="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center"
               [class]="getIconBgClass(toast)">
            @switch (toast.type) {
              @case ('success') {
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
              }
              @case ('error') {
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              }
              @case ('warning') {
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                </svg>
              }
              @case ('info') {
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              }
            }
          </div>

          <!-- Message -->
          <span class="flex-1 text-sm font-medium text-white leading-snug">{{ toast.message }}</span>

          <!-- Close Button -->
          <button 
            (click)="toastService.remove(toast.id)"
            class="flex-shrink-0 text-white/50 hover:text-white transition-colors p-1 -m-1"
            aria-label="Dismiss">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    @keyframes slideIn {
      from { 
        transform: translateX(100%); 
        opacity: 0; 
      }
      to { 
        transform: translateX(0); 
        opacity: 1; 
      }
    }
    
    .animate-slide-in {
      animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    @media (max-width: 640px) {
      @keyframes slideIn {
        from { 
          transform: translateY(-100%); 
          opacity: 0; 
        }
        to { 
          transform: translateY(0); 
          opacity: 1; 
        }
      }
    }
  `]
})
export class ToastComponent {
  readonly toastService = inject(ToastService);

  getToastClasses(toast: Toast): string {
    const baseClasses = 'bg-[#2e2e42]/95';
    
    switch (toast.type) {
      case 'success':
        return `${baseClasses} border-green-500/30`;
      case 'error':
        return `${baseClasses} border-red-500/30`;
      case 'warning':
        return `${baseClasses} border-yellow-500/30`;
      case 'info':
        return `${baseClasses} border-blue-500/30`;
      default:
        return `${baseClasses} border-white/10`;
    }
  }

  getIconBgClass(toast: Toast): string {
    switch (toast.type) {
      case 'success':
        return 'bg-green-500/20 text-green-400';
      case 'error':
        return 'bg-red-500/20 text-red-400';
      case 'warning':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'info':
        return 'bg-blue-500/20 text-blue-400';
      default:
        return 'bg-white/10 text-gray-400';
    }
  }
}