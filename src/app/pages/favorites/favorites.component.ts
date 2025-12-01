// src/app/pages/favorites/favorites.component.ts
import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { BackendService } from '../../services/backend.service';
import { AuthService } from '../../services/auth.service';
import { ActivityGroup, CATEGORY_META } from '../../models/types';

type FavoritesTab = 'groups' | 'clubs';

@Component({
  selector: 'app-favorites',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-[#1c1c2e] text-white pb-28">
      
      <!-- Background -->
      <div class="fixed inset-0 pointer-events-none overflow-hidden">
        <div class="absolute top-[-20%] left-[-20%] w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[150px]"></div>
        <div class="absolute bottom-[-20%] right-[-20%] w-[500px] h-[500px] bg-[#FD7666]/10 rounded-full blur-[150px]"></div>
      </div>

      <!-- Header -->
      <header class="px-5 pt-14 pb-4 relative z-10">
        <h1 class="text-2xl font-bold text-[#FD7666]">Deine Favoriten</h1>
        <p class="text-gray-400 text-sm mt-1">{{ totalFavorites() }} gespeichert</p>
      </header>

      <!-- Search -->
      <div class="px-5 mb-4 relative z-10">
        <div class="relative">
          <svg class="w-5 h-5 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <input 
            type="text" 
            [(ngModel)]="searchQuery"
            placeholder="Suchen..."
            class="w-full bg-[#2e2e42] text-white rounded-xl pl-12 pr-4 py-3 border border-white/5 focus:border-[#FD7666]/50 focus:outline-none transition-colors placeholder-gray-600">
        </div>
      </div>

      <!-- Tabs -->
      <div class="px-5 mb-6 relative z-10">
        <div class="flex bg-[#2e2e42] rounded-xl p-1 border border-white/5">
          <button 
            (click)="activeTab.set('groups')"
            class="flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-300"
            [class]="activeTab() === 'groups' ? 'bg-[#FD7666] text-white' : 'text-gray-400 hover:text-white'">
            Gruppen ({{ favoriteGroups().length }})
          </button>
          <button 
            (click)="activeTab.set('clubs')"
            class="flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-300"
            [class]="activeTab() === 'clubs' ? 'bg-[#FD7666] text-white' : 'text-gray-400 hover:text-white'">
            Clubs ({{ favoriteClubs().length }})
          </button>
        </div>
      </div>

      <!-- Category Filter -->
      <div class="px-5 mb-6 relative z-10">
        <div class="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <button 
            (click)="selectedCategory.set(null)"
            class="px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-300"
            [class]="!selectedCategory() ? 'bg-[#FD7666] text-white' : 'bg-[#2e2e42] text-gray-400 hover:text-white'">
            Alle
          </button>
          @for (cat of categories; track cat.id) {
            <button 
              (click)="selectedCategory.set(cat.id)"
              class="px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-300 flex items-center gap-2"
              [class]="selectedCategory() === cat.id ? 'bg-[#FD7666] text-white' : 'bg-[#2e2e42] text-gray-400 hover:text-white'">
              <span>{{ cat.icon }}</span>
              <span>{{ cat.name }}</span>
            </button>
          }
        </div>
      </div>

      <!-- Content -->
      <section class="px-5 relative z-10">
        @if (isLoading()) {
          <!-- Loading Skeletons -->
          <div class="grid grid-cols-2 gap-4">
            @for (i of [1,2,3,4]; track i) {
              <div class="bg-[#2e2e42] rounded-2xl overflow-hidden animate-pulse">
                <div class="aspect-[4/3] bg-[#3e3e52]"></div>
                <div class="p-3">
                  <div class="h-4 bg-[#3e3e52] rounded w-3/4 mb-2"></div>
                  <div class="h-3 bg-[#3e3e52] rounded w-1/2"></div>
                </div>
              </div>
            }
          </div>
        } @else if (filteredItems().length === 0) {
          <!-- Empty State -->
          <div class="text-center py-16">
            <div class="w-24 h-24 bg-[#2e2e42] rounded-full flex items-center justify-center mx-auto mb-4">
              <svg class="w-12 h-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
              </svg>
            </div>
            <h3 class="text-lg font-bold mb-2">Keine Favoriten</h3>
            <p class="text-gray-500 text-sm mb-6">
              {{ activeTab() === 'groups' ? 'Speichere Gruppen die dir gefallen' : 'Speichere Clubs die dir gefallen' }}
            </p>
            <button 
              (click)="goToExplore()"
              class="px-6 py-3 bg-[#FD7666] hover:bg-[#ff5744] text-white font-medium rounded-xl transition-colors">
              Entdecken
            </button>
          </div>
        } @else {
          <!-- Grid -->
          <div class="grid grid-cols-2 gap-4">
            @for (item of filteredItems(); track item.id) {
              <div 
                (click)="openItem(item)"
                class="bg-[#2e2e42] rounded-2xl overflow-hidden border border-white/5 hover:border-[#FD7666]/30 transition-all duration-300 cursor-pointer group">
                <!-- Image -->
                <div class="relative aspect-[4/3] overflow-hidden">
                  <img 
                    [src]="item.imageUrl || 'https://picsum.photos/400/300?random=' + item.id" 
                    [alt]="item.title"
                    class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
                  <!-- Category Badge -->
                  <span 
                    class="absolute top-2 left-2 px-2 py-1 rounded-lg text-xs font-medium"
                    [style.background]="getCategoryColor(item.category) + '33'"
                    [style.color]="getCategoryColor(item.category)">
                    {{ getCategoryIcon(item.category) }}
                  </span>
                  <!-- Date Badge -->
                  <span class="absolute top-2 right-2 px-2 py-1 bg-black/50 backdrop-blur-sm rounded-lg text-xs text-white">
                    {{ formatDate(item.date) }}
                  </span>
                  <!-- Favorite Button -->
                  <button 
                    (click)="toggleFavorite($event, item)"
                    class="absolute bottom-2 right-2 w-8 h-8 bg-[#FD7666] rounded-full flex items-center justify-center shadow-lg">
                    <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
                    </svg>
                  </button>
                </div>
                <!-- Info -->
                <div class="p-3">
                  <h3 class="font-bold text-sm text-white truncate">{{ item.title }}</h3>
                  <p class="text-gray-400 text-xs mt-1">{{ item.currentMembers }}/{{ item.maxMembers }} Mitglieder</p>
                </div>
              </div>
            }
          </div>
        }
      </section>
    </div>
  `,
  styles: [`
    .scrollbar-hide::-webkit-scrollbar { display: none; }
    .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
  `]
})
export class FavoritesComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly backend = inject(BackendService);

  activeTab = signal<FavoritesTab>('groups');
  searchQuery = '';
  selectedCategory = signal<string | null>(null);
  isLoading = signal(true);

  favoriteGroups = signal<ActivityGroup[]>([]);
  favoriteClubs = signal<ActivityGroup[]>([]);

  categories = Object.entries(CATEGORY_META).map(([id, meta]) => ({ id, ...meta }));

  totalFavorites = computed(() => this.favoriteGroups().length + this.favoriteClubs().length);

  filteredItems = computed(() => {
    let items = this.activeTab() === 'groups' ? this.favoriteGroups() : this.favoriteClubs();
    
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      items = items.filter(i => i.title.toLowerCase().includes(query));
    }
    
    if (this.selectedCategory()) {
      items = items.filter(i => i.category === this.selectedCategory());
    }
    
    return items;
  });

  ngOnInit(): void {
    this.loadFavorites();
  }

  private loadFavorites(): void {
    // TODO: Replace with actual API call
    setTimeout(() => {
      this.favoriteGroups.set([]);
      this.favoriteClubs.set([]);
      this.isLoading.set(false);
    }, 500);
  }

  getCategoryColor(category: string): string {
    return CATEGORY_META[category as keyof typeof CATEGORY_META]?.color || '#FD7666';
  }

  getCategoryIcon(category: string): string {
    return CATEGORY_META[category as keyof typeof CATEGORY_META]?.icon || '✨';
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return `${date.getDate()}.${date.getMonth() + 1}.`;
  }

  openItem(item: ActivityGroup): void {
    const route = this.activeTab() === 'groups' ? '/group' : '/club';
    this.router.navigate([route, item.id]);
  }

  toggleFavorite(event: Event, item: ActivityGroup): void {
    event.stopPropagation();
    // TODO: Implement unfavorite logic
  }

  goToExplore(): void {
    this.router.navigate(['/home']);
  }
}