import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      <div *ngFor="let toast of toastService.toasts()" 
           class="pointer-events-auto min-w-[300px] p-4 rounded-xl shadow-2xl border backdrop-blur-md animate-slide-in flex items-center gap-3"
           [ngClass]="{
             'bg-green-500/10 border-green-500/20 text-green-400': toast.type === 'success',
             'bg-red-500/10 border-red-500/20 text-red-400': toast.type === 'error',
             'bg-blue-500/10 border-blue-500/20 text-blue-400': toast.type === 'info'
           }">
        
        <!-- Icons based on type -->
        <span *ngIf="toast.type === 'success'">✓</span>
        <span *ngIf="toast.type === 'error'">✕</span>
        <span *ngIf="toast.type === 'info'">ℹ</span>

        <span class="text-sm font-medium text-white">{{ toast.message }}</span>
      </div>
    </div>
  `,
  styles: [`
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    .animate-slide-in {
      animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
  `]
})
export class ToastComponent {
  toastService = inject(ToastService);
}