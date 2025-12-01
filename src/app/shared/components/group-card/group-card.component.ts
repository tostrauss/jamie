// src/app/shared/components/group-card/group-card.component.ts
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivityGroup, CATEGORY_META } from '../../../models/types';

@Component({
  selector: 'app-group-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <article class="bg-[#2e2e42] rounded-2xl overflow-hidden relative shadow-lg hover:shadow-orange-500/10 active:scale-[0.98] transition-all cursor-pointer border border-white/5 group">
      
      <!-- Image -->
      <div class="h-32 sm:h-36 w-full relative overflow-hidden">
        <img 
          [src]="group.imageUrl" 
          [alt]="group.title"
          class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          loading="lazy"
          (error)="onImageError($event)">
        <div class="absolute inset-0 bg-gradient-to-t from-[#2e2e42] via-transparent to-transparent opacity-80"></div>
        
        <!-- Member Count Badge -->
        <div class="absolute top-2 right-2 bg-black/50 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10 flex items-center gap-1.5">
          <svg class="w-3 h-3 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
          </svg>
          <span class="text-[10px] text-white font-bold">
            {{ group.currentMembers }}/{{ group.maxMembers }}
          </span>
        </div>

        <!-- Category Badge -->
        <div class="absolute top-2 left-2 px-2 py-0.5 rounded-md"
             [style.background-color]="getCategoryColor()">
          <span class="text-[9px] text-white font-bold uppercase tracking-wider">
            {{ getCategoryName() }}
          </span>
        </div>

        <!-- Full Badge (if applicable) -->
        @if (isFull) {
          <div class="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span class="bg-red-500/90 text-white text-xs font-bold px-3 py-1 rounded-full">
              VOLL
            </span>
          </div>
        }
      </div>

      <!-- Content -->
      <div class="p-3 relative">
        <h3 class="text-sm font-bold text-white leading-tight mb-1 line-clamp-1">
          {{ group.title }}
        </h3>
        
        <div class="flex items-center gap-1 text-[10px] text-gray-400 mb-2">
          <svg class="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
          </svg>
          <span>{{ formatDate(group.date) }}</span>
          <span class="text-gray-600">•</span>
          <span class="line-clamp-1">{{ group.location }}</span>
        </div>
        
        <div class="flex items-center justify-between">
          <!-- Avatars -->
          <div class="flex -space-x-2">
            @for (seed of group.avatarSeeds.slice(0, 3); track seed) {
              <div class="w-6 h-6 rounded-full border-2 border-[#2e2e42] bg-gray-700 overflow-hidden">
                <img 
                  [src]="'https://api.dicebear.com/7.x/avataaars/svg?seed=' + seed" 
                  alt="Member"
                  class="w-full h-full">
              </div>
            }
            @if (group.currentMembers > 3) {
              <div class="w-6 h-6 rounded-full border-2 border-[#2e2e42] bg-[#3e3e52] flex items-center justify-center">
                <span class="text-[8px] text-gray-300 font-bold">
                  +{{ group.currentMembers - 3 }}
                </span>
              </div>
            }
          </div>
          
          <!-- Arrow -->
          <div class="w-7 h-7 rounded-full bg-[#3e3e52] flex items-center justify-center text-gray-300 group-hover:bg-[#ff7043] group-hover:text-white transition-colors">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
          </div>
        </div>
      </div>
    </article>
  `
})
export class GroupCardComponent {
  @Input({ required: true }) group!: ActivityGroup;

  get isFull(): boolean {
    return this.group.currentMembers >= this.group.maxMembers;
  }

  getCategoryColor(): string {
    return CATEGORY_META[this.group.category]?.color || '#ff7043';
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
    (event.target as HTMLImageElement).src = 
      'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=600';
  }
}