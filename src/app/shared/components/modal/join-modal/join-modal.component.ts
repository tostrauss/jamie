// src/app/shared/components/modal/join-modal/join-modal.component.ts
import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivityGroup, CATEGORY_META } from '../../../../models/types';
import { BackendService } from '../../../../services/backend.service';
import { ToastService } from '../../../../services/toast.service';

@Component({
  selector: 'app-join-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <!-- Backdrop -->
      <div 
        class="absolute inset-0 bg-black/80 backdrop-blur-md animate-fade-in" 
        (click)="closeModal()">
      </div>
      
      <!-- Modal -->
      <div class="relative bg-[#2e2e42] w-full max-w-sm rounded-[28px] overflow-hidden shadow-2xl border border-white/10 animate-zoom-in">
        
        <!-- Close Button -->
        <button 
          (click)="closeModal()" 
          class="absolute top-4 right-4 z-10 bg-black/30 hover:bg-black/50 p-2 rounded-full backdrop-blur text-white transition-colors"
          aria-label="Schließen">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>

        <!-- Hero Image -->
        <div class="h-56 relative">
          <img 
            [src]="group.imageUrl || defaultImage"
            [alt]="group.title"
            class="w-full h-full object-cover"
            (error)="onImageError($event)">
          <div class="absolute inset-0 bg-gradient-to-t from-[#2e2e42] via-[#2e2e42]/20 to-transparent"></div>
          
          <!-- Category Badge -->
          <div 
            class="absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
            [style.background-color]="getCategoryColor() + '33'"
            [style.color]="getCategoryColor()">
            {{ getCategoryIcon() }} {{ getCategoryName() }}
          </div>
        </div>

        <!-- Content -->
        <div class="px-6 pb-6 pt-2 text-center relative -mt-4">
          <h2 class="text-2xl font-bold text-white mb-2 leading-tight">{{ group.title }}</h2>
          
          <!-- Info Badges -->
          <div class="flex flex-wrap justify-center gap-2 mb-4">
            <span class="bg-white/5 px-3 py-1.5 rounded-full text-xs text-gray-300 flex items-center gap-1.5">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
              {{ formatDate(group.date) }}
            </span>
            <span class="bg-white/5 px-3 py-1.5 rounded-full text-xs text-gray-300 flex items-center gap-1.5">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
              </svg>
              {{ group.location }}
            </span>
          </div>

          <!-- Description -->
          @if (group.description) {
            <p class="text-sm text-gray-400 mb-5 line-clamp-3">{{ group.description }}</p>
          }
          
          <!-- Avatar Row -->
          <div class="flex justify-center gap-2 mb-4">
            @for (seed of group.avatarSeeds.slice(0, 4); track seed) {
              <div class="w-11 h-11 rounded-xl bg-gray-700 border-2 border-[#2e2e42] overflow-hidden shadow-lg transform hover:scale-110 transition-transform">
                <img 
                  [src]="'https://api.dicebear.com/7.x/avataaars/svg?seed=' + seed" 
                  alt="Mitglied"
                  class="w-full h-full">
              </div>
            }
            <!-- Empty Slot -->
            @if (hasSpace()) {
              <div class="w-11 h-11 rounded-xl bg-white/5 border-2 border-dashed border-white/20 flex items-center justify-center text-white/40">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                </svg>
              </div>
            }
          </div>

          <!-- Member Count -->
          <div class="flex justify-center items-center gap-2 text-sm mb-4"
               [class.text-gray-400]="hasSpace()"
               [class.text-orange-400]="!hasSpace()">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
            </svg>
            <span>
              {{ group.currentMembers }}/{{ group.maxMembers }} Plätze
              @if (!hasSpace()) {
                (voll)
              }
            </span>
          </div>

          <!-- Creator Info -->
          <div class="flex items-center justify-center gap-2 text-xs text-gray-500 mb-4">
            <span>Erstellt von</span>
            <div class="flex items-center gap-1.5">
              <img 
                [src]="group.creator.avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'" 
                class="w-5 h-5 rounded-full"
                alt="">
              <span class="text-gray-300 font-medium">{{ group.creator.username }}</span>
            </div>
          </div>

          <!-- Message Input -->
          <div class="relative mb-4">
            <input 
              type="text" 
              [(ngModel)]="message"
              placeholder="Nachricht an die Gruppe (optional)..." 
              maxlength="200"
              class="input-jamie text-sm"
              [disabled]="!hasSpace()">
          </div>

          <!-- Action Buttons -->
          <div class="space-y-3">
            <button 
              (click)="join()" 
              [disabled]="joining() || !hasSpace()"
              class="w-full btn-jamie btn-primary py-4">
              @if (joining()) {
                <span class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              } @else if (!hasSpace()) {
                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/>
                </svg>
                Gruppe ist voll
              } @else {
                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/>
                </svg>
                Anfrage senden
              }
            </button>

            <button 
              (click)="closeModal()"
              class="w-full btn-jamie btn-secondary py-3">
              Abbrechen
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class JoinModalComponent {
  @Input({ required: true }) group!: ActivityGroup;
  @Output() close = new EventEmitter<void>();

  private readonly backend = inject(BackendService);
  private readonly toast = inject(ToastService);

  joining = signal(false);
  message = '';
  
  readonly defaultImage = 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=600';

  hasSpace(): boolean {
    return this.group.currentMembers < this.group.maxMembers;
  }

  getCategoryColor(): string {
    return CATEGORY_META[this.group.category]?.color || '#ff7043';
  }

  getCategoryIcon(): string {
    return CATEGORY_META[this.group.category]?.icon || '✨';
  }

  getCategoryName(): string {
    return CATEGORY_META[this.group.category]?.name || this.group.category;
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${day}.${month}. ${hours}:${minutes}`;
  }

  onImageError(event: Event): void {
    (event.target as HTMLImageElement).src = this.defaultImage;
  }

  join(): void {
    if (this.joining() || !this.hasSpace()) return;
    
    this.joining.set(true);
    
    this.backend.joinGroup(this.group.id, { 
      message: this.message.trim() || undefined 
    }).subscribe({
      next: () => {
        this.joining.set(false);
        this.toast.success(`Anfrage an "${this.group.title}" gesendet!`);
        this.closeModal();
      },
      error: (err) => {
        this.joining.set(false);
        this.toast.showApiError(err, 'Anfrage konnte nicht gesendet werden');
      }
    });
  }

  closeModal(): void {
    this.close.emit();
  }
}