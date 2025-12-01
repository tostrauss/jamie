// src/app/pages/home/home.component.ts
import { Component, inject, signal, computed, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth.service';
import { FavoritesService } from '../../services/favorites.service';
import { BottomNavComponent } from '../../shared/components/bottom-nav/bottom-nav.component';
import { CreateModalComponent } from '../../shared/components/create-modal/create-modal.component';
import { CITIES, CATEGORY_META } from '../../models/types';

type TabType = 'groups' | 'clubs';
type SortOption = 'recent' | 'popular' | 'nearby' | 'date';

interface Group {
  id: string;
  title: string;
  description?: string;
  category: string;
  city: string;
  location?: string;
  date: string;
  imageUrl?: string;
  currentMembers: number;
  maxMembers: number;
  creatorId: string;
  creator: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
  participants: Array<{
    user: {
      id: string;
      username: string;
      avatarUrl?: string;
    };
  }>;
  isFavorite?: boolean;
}

interface Club {
  id: string;
  title: string;
  description?: string;
  category: string;
  city: string;
  imageUrl?: string;
  isPrivate: boolean;
  memberCount: number;
  creatorId: string;
  creator: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
  isFavorite?: boolean;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, BottomNavComponent, CreateModalComponent],
  template: `
    <div class="min-h-screen bg-[#1c1c2e] text-white pb-24">
      
      <!-- Background Gradients -->
      <div class="fixed inset-0 pointer-events-none overflow-hidden">
        <div class="absolute top-[-30%] left-[-30%] w-[600px] h-[600px] bg-purple-600/8 rounded-full blur-[180px]"></div>
        <div class="absolute bottom-[-30%] right-[-30%] w-[600px] h-[600px] bg-[#FD7666]/8 rounded-full blur-[180px]"></div>
      </div>

      <!-- Header -->
      <header class="sticky top-0 z-30 bg-[#1c1c2e]/95 backdrop-blur-xl border-b border-white/5">
        <div class="px-5 pt-12 pb-4">
          
          <!-- Title Row -->
          <div class="flex items-center justify-between mb-4">
            <h1 class="text-2xl font-bold text-white">
              {{ activeTab() === 'groups' ? 'Alle Gruppen' : 'Alle Clubs' }}
            </h1>
            <div class="flex items-center gap-2">
              <!-- Notification Bell -->
              <button 
                (click)="goToNotifications()"
                class="relative w-10 h-10 bg-[#2e2e42] rounded-xl flex items-center justify-center hover:bg-[#3e3e52] transition-colors">
                <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
                </svg>
                @if (unreadNotifications() > 0) {
                  <span class="absolute -top-1 -right-1 w-5 h-5 bg-[#FD7666] rounded-full text-xs font-bold flex items-center justify-center">
                    {{ unreadNotifications() > 9 ? '9+' : unreadNotifications() }}
                  </span>
                }
              </button>
            </div>
          </div>

          <!-- Search Bar -->
          <div class="relative mb-4">
            <svg class="w-5 h-5 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <input 
              type="text" 
              [(ngModel)]="searchQuery"
              (ngModelChange)="onSearchChange($event)"
              placeholder="Suchen..."
              class="w-full bg-[#2e2e42] text-white rounded-xl pl-12 pr-12 py-3 border border-white/10 focus:border-[#FD7666]/50 focus:outline-none transition-colors placeholder-gray-500">
            @if (searchQuery) {
              <button 
                (click)="clearSearch()"
                class="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            } @else {
              <button 
                (click)="toggleFilters()"
                class="absolute right-4 top-1/2 -translate-y-1/2"
                [class]="hasActiveFilters() ? 'text-[#FD7666]' : 'text-gray-500'">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/>
                </svg>
              </button>
            }
          </div>

          <!-- Category Pills -->
          <div class="flex gap-2 overflow-x-auto pb-2 hide-scrollbar -mx-5 px-5">
            <button 
              (click)="selectCategory(null)"
              class="flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap"
              [class]="!selectedCategory() 
                ? 'bg-[#FD7666] text-white' 
                : 'bg-[#2e2e42] text-gray-400 hover:text-white'">
              Alle
            </button>
            @for (cat of categories; track cat.id) {
              <button 
                (click)="selectCategory(cat.id)"
                class="flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap flex items-center gap-1.5"
                [class]="selectedCategory() === cat.id 
                  ? 'bg-[#FD7666] text-white' 
                  : 'bg-[#2e2e42] text-gray-400 hover:text-white'">
                <span>{{ cat.icon }}</span>
                <span>{{ cat.name }}</span>
              </button>
            }
          </div>
        </div>

        <!-- Tabs -->
        <div class="px-5 pb-3 flex gap-6">
          <button 
            (click)="activeTab.set('groups')"
            class="relative pb-2 text-sm font-medium transition-colors"
            [class]="activeTab() === 'groups' ? 'text-white' : 'text-gray-500 hover:text-gray-300'">
            Gruppen
            @if (activeTab() === 'groups') {
              <span class="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FD7666] rounded-full"></span>
            }
          </button>
          <button 
            (click)="activeTab.set('clubs')"
            class="relative pb-2 text-sm font-medium transition-colors"
            [class]="activeTab() === 'clubs' ? 'text-white' : 'text-gray-500 hover:text-gray-300'">
            Clubs
            @if (activeTab() === 'clubs') {
              <span class="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FD7666] rounded-full"></span>
            }
          </button>
        </div>
      </header>

      <!-- Filter Panel (Expandable) -->
      @if (showFilters()) {
        <div class="px-5 py-4 bg-[#242340] border-b border-white/5 animate-slide-down">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-bold text-white">Filter</h3>
            <button 
              (click)="clearFilters()"
              class="text-[#FD7666] text-sm font-medium">
              Zurücksetzen
            </button>
          </div>

          <!-- City Filter -->
          <div class="mb-4">
            <label class="text-xs text-gray-500 uppercase font-bold tracking-wider mb-2 block">Stadt</label>
            <select 
              [(ngModel)]="selectedCity"
              (ngModelChange)="applyFilters()"
              class="w-full bg-[#2e2e42] text-white rounded-xl px-4 py-3 border border-white/10 focus:outline-none appearance-none">
              <option value="">Alle Städte</option>
              @for (city of cities; track city) {
                <option [value]="city">{{ city }}</option>
              }
            </select>
          </div>

          <!-- Sort -->
          <div>
            <label class="text-xs text-gray-500 uppercase font-bold tracking-wider mb-2 block">Sortieren</label>
            <div class="grid grid-cols-2 gap-2">
              @for (option of sortOptions; track option.value) {
                <button 
                  (click)="selectedSort = option.value; applyFilters()"
                  class="p-2.5 rounded-xl text-sm transition-all"
                  [class]="selectedSort === option.value 
                    ? 'bg-[#FD7666] text-white' 
                    : 'bg-[#2e2e42] text-gray-400'">
                  {{ option.label }}
                </button>
              }
            </div>
          </div>
        </div>
      }

      <!-- Content -->
      <main class="px-5 py-4 relative z-10">
        
        <!-- Loading State -->
        @if (isLoading()) {
          <div class="grid grid-cols-2 gap-3">
            @for (i of [1,2,3,4,5,6]; track i) {
              <div class="bg-[#2e2e42] rounded-2xl overflow-hidden animate-pulse">
                <div class="aspect-[4/3] bg-[#3e3e52]"></div>
                <div class="p-3">
                  <div class="h-4 bg-[#3e3e52] rounded w-3/4 mb-2"></div>
                  <div class="h-3 bg-[#3e3e52] rounded w-1/2"></div>
                </div>
              </div>
            }
          </div>
        } 

        <!-- Empty State -->
        @else if (displayItems().length === 0) {
          <div class="text-center py-16">
            <div class="w-24 h-24 bg-[#2e2e42] rounded-full flex items-center justify-center mx-auto mb-4">
              <svg class="w-12 h-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
              </svg>
            </div>
            <h3 class="text-lg font-bold mb-2">
              {{ searchQuery ? 'Keine Ergebnisse' : 'Keine ' + (activeTab() === 'groups' ? 'Gruppen' : 'Clubs') + ' gefunden' }}
            </h3>
            <p class="text-gray-500 text-sm mb-6">
              {{ searchQuery ? 'Versuche andere Suchbegriffe' : 'Erstelle als Erster eine ' + (activeTab() === 'groups' ? 'Gruppe' : 'Club') + '!' }}
            </p>
            <button 
              (click)="openCreateModal()"
              class="px-6 py-3 bg-[#FD7666] hover:bg-[#ff5744] text-white font-bold rounded-xl transition-colors">
              {{ activeTab() === 'groups' ? 'Gruppe erstellen' : 'Club erstellen' }}
            </button>
          </div>
        }

        <!-- Groups Grid -->
        @else if (activeTab() === 'groups') {
          <div class="grid grid-cols-2 gap-3">
            @for (group of displayItems(); track group.id; let i = $index) {
              <div 
                (click)="openGroup(group.id)"
                class="bg-[#2e2e42] rounded-2xl overflow-hidden border border-white/5 hover:border-[#FD7666]/30 transition-all cursor-pointer group animate-fade-in-up"
                [style.animation-delay]="(i % 6) * 50 + 'ms'">
                
                <!-- Image -->
                <div class="relative aspect-[4/3] overflow-hidden">
                  @if (group.imageUrl) {
                    <img [src]="group.imageUrl" [alt]="group.title" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
                  } @else {
                    <div class="w-full h-full bg-gradient-to-br from-[#3e3e52] to-[#2e2e42] flex items-center justify-center">
                      <span class="text-4xl">{{ getCategoryIcon(group.category) }}</span>
                    </div>
                  }
                  
                  <!-- Overlay gradient -->
                  <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                  
                  <!-- Date Badge -->
                  @if (isToday(group.date)) {
                    <span class="absolute top-2 left-2 px-2 py-1 bg-[#FD7666] text-white text-[10px] font-bold rounded-lg">
                      Heute
                    </span>
                  } @else if (isTomorrow(group.date)) {
                    <span class="absolute top-2 left-2 px-2 py-1 bg-purple-500 text-white text-[10px] font-bold rounded-lg">
                      Morgen
                    </span>
                  }

                  <!-- Favorite Button -->
                  <button 
                    (click)="toggleFavorite($event, group.id, 'group')"
                    class="absolute top-2 right-2 w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                    [class]="group.isFavorite ? 'bg-[#FD7666]' : 'bg-black/40 hover:bg-black/60'">
                    <svg 
                      class="w-4 h-4 transition-colors"
                      [class]="group.isFavorite ? 'text-white fill-current' : 'text-white'"
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
                    </svg>
                  </button>

                  <!-- Title & Members on Image -->
                  <div class="absolute bottom-2 left-2 right-2">
                    <h3 class="font-bold text-white text-sm leading-tight line-clamp-1">{{ group.title }}</h3>
                    <p class="text-[10px] text-gray-300 mt-0.5">
                      {{ group.currentMembers }}/{{ group.maxMembers }} Members
                    </p>
                  </div>
                </div>

                <!-- Member Avatars -->
                <div class="p-2.5 flex items-center justify-between">
                  <div class="flex -space-x-2">
                    @for (participant of group.participants.slice(0, 4); track participant.user.id; let j = $index) {
                      <div 
                        class="w-7 h-7 rounded-full border-2 border-[#2e2e42] overflow-hidden bg-[#3e3e52]"
                        [style.z-index]="10 - j">
                        @if (participant.user.avatarUrl) {
                          <img [src]="participant.user.avatarUrl" class="w-full h-full object-cover">
                        } @else {
                          <div class="w-full h-full flex items-center justify-center text-[10px] font-bold text-gray-400">
                            {{ participant.user.username.charAt(0).toUpperCase() }}
                          </div>
                        }
                      </div>
                    }
                    @if (group.participants.length > 4) {
                      <div class="w-7 h-7 rounded-full border-2 border-[#2e2e42] bg-[#3e3e52] flex items-center justify-center text-[10px] font-bold text-gray-400">
                        +{{ group.participants.length - 4 }}
                      </div>
                    }
                  </div>
                  
                  <!-- Join Button -->
                  @if (group.currentMembers < group.maxMembers) {
                    <button 
                      (click)="joinGroup($event, group.id)"
                      class="w-7 h-7 bg-[#FD7666]/20 hover:bg-[#FD7666] rounded-lg flex items-center justify-center transition-colors group/btn">
                      <svg class="w-4 h-4 text-[#FD7666] group-hover/btn:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                      </svg>
                    </button>
                  }
                </div>
              </div>
            }
          </div>
        }

        <!-- Clubs Grid -->
        @else {
          <div class="grid grid-cols-2 gap-3">
            @for (club of displayItems(); track club.id; let i = $index) {
              <div 
                (click)="openClub(club.id)"
                class="bg-[#2e2e42] rounded-2xl overflow-hidden border border-white/5 hover:border-purple-500/30 transition-all cursor-pointer group animate-fade-in-up"
                [style.animation-delay]="(i % 6) * 50 + 'ms'">
                
                <!-- Image -->
                <div class="relative aspect-[4/3] overflow-hidden">
                  @if (club.imageUrl) {
                    <img [src]="club.imageUrl" [alt]="club.title" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
                  } @else {
                    <div class="w-full h-full bg-gradient-to-br from-purple-900/50 to-[#2e2e42] flex items-center justify-center">
                      <span class="text-4xl">{{ getCategoryIcon(club.category) }}</span>
                    </div>
                  }
                  
                  <!-- Overlay gradient -->
                  <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                  
                  <!-- Private Badge -->
                  @if (club.isPrivate) {
                    <span class="absolute top-2 left-2 px-2 py-1 bg-yellow-500/90 text-black text-[10px] font-bold rounded-lg flex items-center gap-1">
                      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                      </svg>
                      Privat
                    </span>
                  }

                  <!-- Favorite Button -->
                  <button 
                    (click)="toggleFavorite($event, club.id, 'club')"
                    class="absolute top-2 right-2 w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                    [class]="club.isFavorite ? 'bg-purple-500' : 'bg-black/40 hover:bg-black/60'">
                    <svg 
                      class="w-4 h-4 transition-colors"
                      [class]="club.isFavorite ? 'text-white fill-current' : 'text-white'"
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
                    </svg>
                  </button>

                  <!-- Title & Members on Image -->
                  <div class="absolute bottom-2 left-2 right-2">
                    <h3 class="font-bold text-white text-sm leading-tight line-clamp-1">{{ club.title }}</h3>
                    <p class="text-[10px] text-gray-300 mt-0.5">
                      {{ club.memberCount }} {{ club.memberCount === 1 ? 'Mitglied' : 'Mitglieder' }}
                    </p>
                  </div>
                </div>

                <!-- Category & City -->
                <div class="p-2.5 flex items-center justify-between">
                  <span 
                    class="px-2 py-1 rounded-lg text-[10px] font-medium"
                    [style.background]="getCategoryColor(club.category) + '33'"
                    [style.color]="getCategoryColor(club.category)">
                    {{ getCategoryIcon(club.category) }} {{ getCategoryName(club.category) }}
                  </span>
                  <span class="text-[10px] text-gray-500">{{ club.city }}</span>
                </div>
              </div>
            }
          </div>
        }

        <!-- Load More -->
        @if (hasMore() && !isLoading()) {
          <div class="text-center py-8">
            <button 
              (click)="loadMore()"
              [disabled]="isLoadingMore()"
              class="px-8 py-3 bg-[#2e2e42] hover:bg-[#3e3e52] text-gray-400 font-medium rounded-xl transition-colors disabled:opacity-50">
              @if (isLoadingMore()) {
                <div class="w-5 h-5 border-2 border-gray-500/30 border-t-gray-500 rounded-full animate-spin mx-auto"></div>
              } @else {
                Mehr laden
              }
            </button>
          </div>
        }
      </main>

      <!-- Bottom Navigation -->
      <app-bottom-nav 
        [unreadChats]="unreadChats()" 
        [unreadNotifications]="unreadNotifications()"
        (createClick)="openCreateModal()">
      </app-bottom-nav>

      <!-- Create Modal -->
      @if (showCreateModal()) {
        <app-create-modal 
          (closeModal)="showCreateModal.set(false)"
          (created)="onCreated($event)">
        </app-create-modal>
      }
    </div>
  `,
  styles: [`
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes slideDown {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-fade-in-up { 
      opacity: 0;
      animation: fadeInUp 0.4s ease-out forwards; 
    }
    .animate-slide-down { animation: slideDown 0.3s ease-out forwards; }
    .line-clamp-1 {
      display: -webkit-box;
      -webkit-line-clamp: 1;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .hide-scrollbar::-webkit-scrollbar { display: none; }
    .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
  `]
})
export class HomeComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly favorites = inject(FavoritesService);
  private readonly destroy$ = new Subject<void>();
  private readonly searchSubject = new Subject<string>();

  // State
  activeTab = signal<TabType>('groups');
  groups = signal<Group[]>([]);
  clubs = signal<Club[]>([]);
  isLoading = signal(true);
  isLoadingMore = signal(false);
  hasMore = signal(true);
  showFilters = signal(false);
  showCreateModal = signal(false);
  
  // Badge counts
  unreadChats = signal(0);
  unreadNotifications = signal(0);

  // Search & Filter
  searchQuery = '';
  selectedCategory = signal<string | null>(null);
  selectedCity = '';
  selectedSort: SortOption = 'recent';

  // Data
  cities = CITIES;
  categories = Object.entries(CATEGORY_META).map(([id, meta]) => ({ id, ...meta }));
  sortOptions = [
    { value: 'recent' as const, label: 'Neueste' },
    { value: 'popular' as const, label: 'Beliebt' },
    { value: 'nearby' as const, label: 'In der Nähe' },
    { value: 'date' as const, label: 'Nach Datum' }
  ];

  // Pagination
  offset = 0;
  limit = 20;

  // Computed
  displayItems = computed(() => {
    return this.activeTab() === 'groups' ? this.groups() : this.clubs();
  });

  ngOnInit(): void {
    this.loadData();
    this.loadBadgeCounts();
    this.setupSearch();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupSearch(): void {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.resetAndLoad();
    });
  }

  private loadData(): void {
    this.isLoading.set(true);
    this.offset = 0;

    if (this.activeTab() === 'groups') {
      this.loadGroups();
    } else {
      this.loadClubs();
    }
  }

  private loadGroups(): void {
    const params = this.buildParams();
    
    this.http.get<{ groups: Group[]; total: number }>(
      `${environment.apiUrl}/groups?${params}`
    ).subscribe({
      next: (response) => {
        const groupsWithFavorites = response.groups.map(g => ({
          ...g,
          isFavorite: this.favorites.isFavorite(g.id, 'group')
        }));
        this.groups.set(groupsWithFavorites);
        this.hasMore.set(response.groups.length === this.limit);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.loadMockGroups();
      }
    });
  }

  private loadClubs(): void {
    const params = this.buildParams();
    
    this.http.get<{ clubs: Club[]; total: number }>(
      `${environment.apiUrl}/clubs?${params}`
    ).subscribe({
      next: (response) => {
        const clubsWithFavorites = response.clubs.map(c => ({
          ...c,
          isFavorite: this.favorites.isFavorite(c.id, 'club')
        }));
        this.clubs.set(clubsWithFavorites);
        this.hasMore.set(response.clubs.length === this.limit);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.loadMockClubs();
      }
    });
  }

  private buildParams(): string {
    const params = new URLSearchParams();
    params.append('limit', this.limit.toString());
    params.append('offset', this.offset.toString());
    
    if (this.searchQuery) params.append('search', this.searchQuery);
    if (this.selectedCategory()) params.append('category', this.selectedCategory()!);
    if (this.selectedCity) params.append('city', this.selectedCity);
    if (this.selectedSort) params.append('sortBy', this.selectedSort);
    
    return params.toString();
  }

  private loadMockGroups(): void {
    const mockGroups: Group[] = [
      {
        id: '1',
        title: 'Wandern',
        category: 'hiking',
        city: 'München',
        date: new Date().toISOString(),
        currentMembers: 4,
        maxMembers: 6,
        creatorId: '1',
        creator: { id: '1', username: 'Max' },
        participants: [
          { user: { id: '1', username: 'Max', avatarUrl: 'https://i.pravatar.cc/100?u=1' } },
          { user: { id: '2', username: 'Lisa', avatarUrl: 'https://i.pravatar.cc/100?u=2' } },
          { user: { id: '3', username: 'Tom', avatarUrl: 'https://i.pravatar.cc/100?u=3' } },
          { user: { id: '4', username: 'Anna', avatarUrl: 'https://i.pravatar.cc/100?u=4' } }
        ],
        isFavorite: false
      },
      {
        id: '2',
        title: 'Volleyball',
        category: 'volleyball',
        city: 'München',
        date: new Date(Date.now() + 86400000).toISOString(),
        currentMembers: 4,
        maxMembers: 8,
        creatorId: '2',
        creator: { id: '2', username: 'Lisa' },
        participants: [
          { user: { id: '2', username: 'Lisa', avatarUrl: 'https://i.pravatar.cc/100?u=2' } },
          { user: { id: '5', username: 'Ben', avatarUrl: 'https://i.pravatar.cc/100?u=5' } },
          { user: { id: '6', username: 'Sarah' } },
          { user: { id: '7', username: 'Chris', avatarUrl: 'https://i.pravatar.cc/100?u=7' } }
        ],
        isFavorite: true
      },
      {
        id: '3',
        title: 'Tennis Match',
        category: 'tennis',
        city: 'Berlin',
        date: new Date(Date.now() + 172800000).toISOString(),
        currentMembers: 2,
        maxMembers: 4,
        creatorId: '3',
        creator: { id: '3', username: 'Tom' },
        participants: [
          { user: { id: '3', username: 'Tom', avatarUrl: 'https://i.pravatar.cc/100?u=3' } },
          { user: { id: '8', username: 'Julia', avatarUrl: 'https://i.pravatar.cc/100?u=8' } }
        ],
        isFavorite: false
      },
      {
        id: '4',
        title: 'Beachvolleyball',
        category: 'volleyball',
        city: 'Hamburg',
        date: new Date().toISOString(),
        currentMembers: 6,
        maxMembers: 8,
        creatorId: '4',
        creator: { id: '4', username: 'Anna' },
        participants: [
          { user: { id: '4', username: 'Anna', avatarUrl: 'https://i.pravatar.cc/100?u=4' } },
          { user: { id: '9', username: 'Mike', avatarUrl: 'https://i.pravatar.cc/100?u=9' } },
          { user: { id: '10', username: 'Emma' } },
          { user: { id: '11', username: 'Jan', avatarUrl: 'https://i.pravatar.cc/100?u=11' } },
          { user: { id: '12', username: 'Lena', avatarUrl: 'https://i.pravatar.cc/100?u=12' } },
          { user: { id: '13', username: 'Felix' } }
        ],
        isFavorite: false
      }
    ];

    this.groups.set(mockGroups);
    this.hasMore.set(false);
  }

  private loadMockClubs(): void {
    const mockClubs: Club[] = [
      {
        id: '1',
        title: 'Tennis Club München',
        category: 'tennis',
        city: 'München',
        memberCount: 156,
        isPrivate: false,
        creatorId: '1',
        creator: { id: '1', username: 'Max' },
        isFavorite: true
      },
      {
        id: '2',
        title: 'Hiking Friends',
        category: 'hiking',
        city: 'München',
        memberCount: 89,
        isPrivate: false,
        creatorId: '2',
        creator: { id: '2', username: 'Lisa' },
        isFavorite: false
      },
      {
        id: '3',
        title: 'Elite Runners',
        category: 'running',
        city: 'Berlin',
        memberCount: 42,
        isPrivate: true,
        creatorId: '3',
        creator: { id: '3', username: 'Tom' },
        isFavorite: false
      },
      {
        id: '4',
        title: 'Beach Volleyball Crew',
        category: 'volleyball',
        city: 'Hamburg',
        memberCount: 234,
        isPrivate: false,
        creatorId: '4',
        creator: { id: '4', username: 'Anna' },
        isFavorite: true
      }
    ];

    this.clubs.set(mockClubs);
    this.hasMore.set(false);
  }

  private loadBadgeCounts(): void {
    // Load unread notifications
    this.http.get<{ count: number }>(`${environment.apiUrl}/notifications/unread-count`).subscribe({
      next: (response) => this.unreadNotifications.set(response.count),
      error: () => this.unreadNotifications.set(3) // Mock for dev
    });

    // Load unread chats
    this.http.get<{ count: number }>(`${environment.apiUrl}/chats/unread-count`).subscribe({
      next: (response) => this.unreadChats.set(response.count),
      error: () => this.unreadChats.set(2) // Mock for dev
    });
  }

  // Search & Filter Actions
  onSearchChange(value: string): void {
    this.searchSubject.next(value);
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.resetAndLoad();
  }

  selectCategory(categoryId: string | null): void {
    this.selectedCategory.set(categoryId);
    this.resetAndLoad();
  }

  toggleFilters(): void {
    this.showFilters.update(v => !v);
  }

  applyFilters(): void {
    this.resetAndLoad();
  }

  clearFilters(): void {
    this.selectedCategory.set(null);
    this.selectedCity = '';
    this.selectedSort = 'recent';
    this.resetAndLoad();
  }

  hasActiveFilters(): boolean {
    return !!this.selectedCategory() || !!this.selectedCity || this.selectedSort !== 'recent';
  }

  private resetAndLoad(): void {
    this.offset = 0;
    this.loadData();
  }

  loadMore(): void {
    if (this.isLoadingMore() || !this.hasMore()) return;

    this.isLoadingMore.set(true);
    this.offset += this.limit;

    const params = this.buildParams();
    const endpoint = this.activeTab() === 'groups' ? 'groups' : 'clubs';

    this.http.get<{ groups?: Group[]; clubs?: Club[] }>(
      `${environment.apiUrl}/${endpoint}?${params}`
    ).subscribe({
      next: (response) => {
        if (this.activeTab() === 'groups' && response.groups) {
          this.groups.update(items => [...items, ...response.groups!.map(g => ({
            ...g,
            isFavorite: this.favorites.isFavorite(g.id, 'group')
          }))]);
          this.hasMore.set(response.groups.length === this.limit);
        } else if (response.clubs) {
          this.clubs.update(items => [...items, ...response.clubs!.map(c => ({
            ...c,
            isFavorite: this.favorites.isFavorite(c.id, 'club')
          }))]);
          this.hasMore.set(response.clubs.length === this.limit);
        }
        this.isLoadingMore.set(false);
      },
      error: () => {
        this.isLoadingMore.set(false);
      }
    });
  }

  // Navigation
  openGroup(id: string): void {
    this.router.navigate(['/group', id]);
  }

  openClub(id: string): void {
    this.router.navigate(['/club', id]);
  }

  goToNotifications(): void {
    this.router.navigate(['/notifications']);
  }

  openCreateModal(): void {
    this.showCreateModal.set(true);
  }

  onCreated(event: { type: string; id: string }): void {
    this.resetAndLoad();
  }

  // Actions
  toggleFavorite(event: Event, id: string, type: 'group' | 'club'): void {
    event.stopPropagation();
    
    this.favorites.toggleFavorite(id, type === 'group' ? 'GROUP' : 'CLUB');

    if (type === 'group') {
      this.groups.update(items => items.map(g => 
        g.id === id ? { ...g, isFavorite: !g.isFavorite } : g
      ));
    } else {
      this.clubs.update(items => items.map(c => 
        c.id === id ? { ...c, isFavorite: !c.isFavorite } : c
      ));
    }
  }

  joinGroup(event: Event, groupId: string): void {
    event.stopPropagation();
    
    this.http.post(`${environment.apiUrl}/groups/${groupId}/join`, {}).subscribe({
      next: () => {
        this.router.navigate(['/group', groupId]);
      },
      error: (err) => {
        console.error('Error joining group:', err);
      }
    });
  }

  // Helpers
  getCategoryIcon(category: string): string {
    return CATEGORY_META[category as keyof typeof CATEGORY_META]?.icon || '✨';
  }

  getCategoryName(category: string): string {
    return CATEGORY_META[category as keyof typeof CATEGORY_META]?.name || category;
  }

  getCategoryColor(category: string): string {
    return CATEGORY_META[category as keyof typeof CATEGORY_META]?.color || '#FD7666';
  }

  isToday(dateString: string): boolean {
    const date = new Date(dateString);
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }

  isTomorrow(dateString: string): boolean {
    const date = new Date(dateString);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return date.toDateString() === tomorrow.toDateString();
  }

  // Tab change watcher
  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.showFilters()) {
      this.showFilters.set(false);
    }
  }
}