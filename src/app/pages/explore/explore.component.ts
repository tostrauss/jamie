// src/app/pages/explore/explore.component.ts
import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { BackendService } from '../../services/backend.service';
import { GroupCardComponent } from '../../shared/components/group-card/group-card.component';
import { SkeletonCardComponent } from '../../shared/components/skeleton/skeleton-card.component';
import { JoinModalComponent } from '../../shared/components/modal/join-modal/join-modal.component';
import { ActivityGroup, ActivityCategory, CATEGORY_META, CITIES, GroupFilters } from '../../models/types';

type SortOption = 'date' | 'members' | 'newest';
type ViewMode = 'grid' | 'list';

@Component({
  selector: 'app-explore',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    GroupCardComponent,
    SkeletonCardComponent,
    JoinModalComponent
  ],
  template: `
    <div class="min-h-screen bg-[#1c1c2e] text-white pb-28">
      
      <!-- Header -->
      <header class="sticky top-0 z-30 bg-[#1c1c2e]/95 backdrop-blur-lg border-b border-white/5">
        <div class="px-5 pt-safe-top">
          <div class="flex items-center justify-between py-4">
            <h1 class="text-xl font-bold">Entdecken</h1>
            
            <!-- View Toggle -->
            <div class="flex items-center gap-2">
              <button 
                (click)="viewMode.set('grid')"
                class="p-2 rounded-lg transition-colors"
                [class.bg-white/10]="viewMode() === 'grid'"
                [class.text-white]="viewMode() === 'grid'"
                [class.text-gray-500]="viewMode() !== 'grid'">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/>
                </svg>
              </button>
              <button 
                (click)="viewMode.set('list')"
                class="p-2 rounded-lg transition-colors"
                [class.bg-white/10]="viewMode() === 'list'"
                [class.text-white]="viewMode() === 'list'"
                [class.text-gray-500]="viewMode() !== 'list'">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
                </svg>
              </button>
            </div>
          </div>
          
          <!-- Search Bar -->
          <div class="relative mb-4">
            <input 
              type="text" 
              placeholder="Suche nach Aktivitäten, Orten..." 
              [(ngModel)]="searchQuery"
              (input)="onSearch()"
              class="w-full bg-[#2e2e42] text-gray-200 placeholder-gray-500 rounded-2xl py-3.5 pl-12 pr-12 border border-white/5 focus:outline-none focus:border-[#ff7043]/50 transition-all">
            <svg class="w-5 h-5 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            @if (searchQuery) {
              <button 
                (click)="clearSearch()"
                class="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            }
          </div>
        </div>
      </header>

      <!-- Filters -->
      <section class="px-5 py-4 space-y-4">
        
        <!-- Filter Toggle Button -->
        <button 
          (click)="showFilters.set(!showFilters())"
          class="w-full flex items-center justify-between bg-[#2e2e42] rounded-xl px-4 py-3 border border-white/5">
          <div class="flex items-center gap-2">
            <svg class="w-5 h-5 text-[#ff7043]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/>
            </svg>
            <span class="font-medium">Filter</span>
            @if (activeFilterCount() > 0) {
              <span class="bg-[#ff7043] text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {{ activeFilterCount() }}
              </span>
            }
          </div>
          <svg 
            class="w-5 h-5 text-gray-400 transition-transform"
            [class.rotate-180]="showFilters()"
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
          </svg>
        </button>

        <!-- Filter Panel -->
        @if (showFilters()) {
          <div class="bg-[#2e2e42] rounded-2xl p-4 border border-white/5 space-y-5 animate-slide-down">
            
            <!-- City -->
            <div class="space-y-2">
              <label class="text-xs text-gray-400 uppercase font-bold tracking-wider">Stadt</label>
              <div class="flex flex-wrap gap-2">
                @for (city of cities; track city) {
                  <button 
                    (click)="toggleCity(city)"
                    class="px-3 py-1.5 rounded-full text-sm font-medium transition-all border"
                    [class.bg-[#ff7043]]="selectedCity() === city"
                    [class.border-[#ff7043]]="selectedCity() === city"
                    [class.text-white]="selectedCity() === city"
                    [class.bg-transparent]="selectedCity() !== city"
                    [class.border-white/10]="selectedCity() !== city"
                    [class.text-gray-400]="selectedCity() !== city">
                    {{ city }}
                  </button>
                }
              </div>
            </div>

            <!-- Category -->
            <div class="space-y-2">
              <label class="text-xs text-gray-400 uppercase font-bold tracking-wider">Kategorie</label>
              <div class="flex flex-wrap gap-2">
                @for (cat of categories; track cat.id) {
                  <button 
                    (click)="toggleCategory(cat.id)"
                    class="px-3 py-1.5 rounded-full text-sm font-medium transition-all border flex items-center gap-1.5"
                    [class.bg-[#ff7043]]="selectedCategory() === cat.id"
                    [class.border-[#ff7043]]="selectedCategory() === cat.id"
                    [class.text-white]="selectedCategory() === cat.id"
                    [class.bg-transparent]="selectedCategory() !== cat.id"
                    [class.border-white/10]="selectedCategory() !== cat.id"
                    [class.text-gray-400]="selectedCategory() !== cat.id">
                    <span>{{ cat.icon }}</span>
                    <span>{{ cat.name }}</span>
                  </button>
                }
              </div>
            </div>

            <!-- Date Range -->
            <div class="space-y-2">
              <label class="text-xs text-gray-400 uppercase font-bold tracking-wider">Zeitraum</label>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="text-[10px] text-gray-500 mb-1 block">Von</label>
                  <input 
                    type="date" 
                    [(ngModel)]="dateFrom"
                    (change)="applyFilters()"
                    [min]="today"
                    class="input-jamie text-sm">
                </div>
                <div>
                  <label class="text-[10px] text-gray-500 mb-1 block">Bis</label>
                  <input 
                    type="date" 
                    [(ngModel)]="dateTo"
                    (change)="applyFilters()"
                    [min]="dateFrom || today"
                    class="input-jamie text-sm">
                </div>
              </div>
            </div>

            <!-- Quick Date Filters -->
            <div class="flex flex-wrap gap-2">
              <button 
                (click)="setDateRange('today')"
                class="px-3 py-1.5 rounded-full text-xs font-medium bg-white/5 text-gray-300 hover:bg-white/10 transition-colors">
                Heute
              </button>
              <button 
                (click)="setDateRange('tomorrow')"
                class="px-3 py-1.5 rounded-full text-xs font-medium bg-white/5 text-gray-300 hover:bg-white/10 transition-colors">
                Morgen
              </button>
              <button 
                (click)="setDateRange('weekend')"
                class="px-3 py-1.5 rounded-full text-xs font-medium bg-white/5 text-gray-300 hover:bg-white/10 transition-colors">
                Dieses Wochenende
              </button>
              <button 
                (click)="setDateRange('week')"
                class="px-3 py-1.5 rounded-full text-xs font-medium bg-white/5 text-gray-300 hover:bg-white/10 transition-colors">
                Diese Woche
              </button>
            </div>

            <!-- Has Space Toggle -->
            <div class="flex items-center justify-between">
              <span class="text-sm text-gray-300">Nur mit freien Plätzen</span>
              <button 
                (click)="toggleHasSpace()"
                class="w-12 h-7 rounded-full transition-colors relative"
                [class.bg-[#ff7043]]="hasSpaceOnly()"
                [class.bg-white/10]="!hasSpaceOnly()">
                <span 
                  class="absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-all"
                  [class.left-1]="!hasSpaceOnly()"
                  [class.left-6]="hasSpaceOnly()">
                </span>
              </button>
            </div>

            <!-- Sort -->
            <div class="space-y-2">
              <label class="text-xs text-gray-400 uppercase font-bold tracking-wider">Sortieren nach</label>
              <div class="flex gap-2">
                <button 
                  (click)="setSortOption('date')"
                  class="flex-1 py-2 rounded-xl text-sm font-medium transition-all"
                  [class.bg-[#ff7043]]="sortOption() === 'date'"
                  [class.text-white]="sortOption() === 'date'"
                  [class.bg-white/5]="sortOption() !== 'date'"
                  [class.text-gray-400]="sortOption() !== 'date'">
                  Datum
                </button>
                <button 
                  (click)="setSortOption('members')"
                  class="flex-1 py-2 rounded-xl text-sm font-medium transition-all"
                  [class.bg-[#ff7043]]="sortOption() === 'members'"
                  [class.text-white]="sortOption() === 'members'"
                  [class.bg-white/5]="sortOption() !== 'members'"
                  [class.text-gray-400]="sortOption() !== 'members'">
                  Beliebtheit
                </button>
                <button 
                  (click)="setSortOption('newest')"
                  class="flex-1 py-2 rounded-xl text-sm font-medium transition-all"
                  [class.bg-[#ff7043]]="sortOption() === 'newest'"
                  [class.text-white]="sortOption() === 'newest'"
                  [class.bg-white/5]="sortOption() !== 'newest'"
                  [class.text-gray-400]="sortOption() !== 'newest'">
                  Neueste
                </button>
              </div>
            </div>

            <!-- Clear Filters -->
            @if (activeFilterCount() > 0) {
              <button 
                (click)="clearAllFilters()"
                class="w-full py-2.5 text-sm font-medium text-red-400 hover:text-red-300 transition-colors">
                Alle Filter zurücksetzen
              </button>
            }
          </div>
        }
      </section>

      <!-- Results Count -->
      <div class="px-5 mb-4 flex items-center justify-between">
        <p class="text-sm text-gray-400">
          <span class="text-white font-bold">{{ sortedGroups().length }}</span> 
          Ergebnis{{ sortedGroups().length !== 1 ? 'se' : '' }}
        </p>
        @if (isLoading()) {
          <span class="text-xs text-gray-500">Lädt...</span>
        }
      </div>

      <!-- Results -->
      <main class="px-4">
        @if (isLoading()) {
          <div class="grid gap-3" [class.grid-cols-2]="viewMode() === 'grid'" [class.grid-cols-1]="viewMode() === 'list'">
            @for (i of [1,2,3,4,5,6]; track i) {
              <app-skeleton-card />
            }
          </div>
        } @else if (sortedGroups().length === 0) {
          <div class="text-center py-16">
            <div class="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg class="w-10 h-10 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
            </div>
            <h3 class="text-lg font-semibold mb-2">Keine Ergebnisse</h3>
            <p class="text-sm text-gray-400 mb-4 max-w-xs mx-auto">
              Versuche andere Suchbegriffe oder passe deine Filter an.
            </p>
            <button 
              (click)="clearAllFilters()"
              class="text-[#ff7043] text-sm font-medium hover:underline">
              Filter zurücksetzen
            </button>
          </div>
        } @else {
          <!-- Grid View -->
          @if (viewMode() === 'grid') {
            <div class="grid grid-cols-2 gap-3">
              @for (group of sortedGroups(); track group.id) {
                <app-group-card 
                  [group]="group"
                  (click)="openGroup(group)" />
              }
            </div>
          }
          
          <!-- List View -->
          @if (viewMode() === 'list') {
            <div class="space-y-3">
              @for (group of sortedGroups(); track group.id) {
                <div 
                  (click)="openGroup(group)"
                  class="bg-[#2e2e42] rounded-2xl p-4 border border-white/5 hover:border-white/10 transition-all cursor-pointer flex gap-4">
                  <div class="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0">
                    <img 
                      [src]="group.imageUrl" 
                      [alt]="group.title"
                      class="w-full h-full object-cover">
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-start justify-between gap-2">
                      <h3 class="font-semibold text-white line-clamp-1">{{ group.title }}</h3>
                      <span class="text-lg flex-shrink-0">{{ getCategoryIcon(group.category) }}</span>
                    </div>
                    <p class="text-xs text-gray-400 mt-1 line-clamp-1">{{ group.description }}</p>
                    <div class="flex items-center gap-3 mt-2 text-xs text-gray-500">
                      <span class="flex items-center gap-1">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                        </svg>
                        {{ formatDate(group.date) }}
                      </span>
                      <span class="flex items-center gap-1">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                        </svg>
                        {{ group.location }}
                      </span>
                      <span class="flex items-center gap-1">
                        <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
                        </svg>
                        {{ group.currentMembers }}/{{ group.maxMembers }}
                      </span>
                    </div>
                  </div>
                </div>
              }
            </div>
          }
        }
      </main>

      <!-- Join Modal -->
      @if (selectedGroup()) {
        <app-join-modal 
          [group]="selectedGroup()!" 
          (close)="closeGroup()" />
      }
    </div>
  `
})
export class ExploreComponent implements OnInit, OnDestroy {
  private readonly backend = inject(BackendService);
  private readonly router = inject(Router);
  private readonly destroy$ = new Subject<void>();

  // View state
  viewMode = signal<ViewMode>('grid');
  showFilters = signal(false);
  selectedGroup = signal<ActivityGroup | null>(null);

  // Filter state
  searchQuery = '';
  dateFrom = '';
  dateTo = '';
  
  readonly selectedCity = this.backend.selectedCity;
  readonly selectedCategory = computed(() => this.backend.activeFilters().category);
  readonly hasSpaceOnly = signal(false);
  readonly sortOption = signal<SortOption>('date');

  // Data
  readonly isLoading = this.backend.isLoadingGroups;
  readonly filteredGroups = this.backend.filteredGroups;
  
  readonly cities = CITIES;
  readonly categories = Object.entries(CATEGORY_META).map(([id, meta]) => ({
    id: id as ActivityCategory,
    ...meta
  }));

  readonly today = new Date().toISOString().split('T')[0];

  // Computed
  readonly activeFilterCount = computed(() => {
    let count = 0;
    if (this.selectedCategory()) count++;
    if (this.dateFrom || this.dateTo) count++;
    if (this.hasSpaceOnly()) count++;
    if (this.searchQuery) count++;
    return count;
  });

  readonly sortedGroups = computed(() => {
    let groups = [...this.filteredGroups()];
    
    // Apply hasSpace filter
    if (this.hasSpaceOnly()) {
      groups = groups.filter(g => g.currentMembers < g.maxMembers);
    }

    // Apply sorting
    switch (this.sortOption()) {
      case 'date':
        groups.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        break;
      case 'members':
        groups.sort((a, b) => b.currentMembers - a.currentMembers);
        break;
      case 'newest':
        groups.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
    }

    return groups;
  });

  private searchTimeout: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    // Load groups if not already loaded
    if (this.filteredGroups().length === 0) {
      this.backend.loadGroups();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
  }

  // Search
  onSearch(): void {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    this.searchTimeout = setTimeout(() => {
      this.backend.updateFilters({ search: this.searchQuery || undefined });
    }, 300);
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.backend.updateFilters({ search: undefined });
  }

  // City
  toggleCity(city: string): void {
    if (this.selectedCity() === city) {
      // Can't deselect city, just keep it
    } else {
      this.backend.setCity(city);
    }
  }

  // Category
  toggleCategory(categoryId: ActivityCategory): void {
    this.backend.toggleCategoryFilter(categoryId);
  }

  // Date Range
  setDateRange(range: 'today' | 'tomorrow' | 'weekend' | 'week'): void {
    const today = new Date();
    let from = new Date();
    let to = new Date();

    switch (range) {
      case 'today':
        // Just today
        break;
      case 'tomorrow':
        from.setDate(today.getDate() + 1);
        to.setDate(today.getDate() + 1);
        break;
      case 'weekend':
        const dayOfWeek = today.getDay();
        const daysUntilSaturday = dayOfWeek === 0 ? 6 : 6 - dayOfWeek;
        from.setDate(today.getDate() + daysUntilSaturday);
        to.setDate(today.getDate() + daysUntilSaturday + 1);
        break;
      case 'week':
        to.setDate(today.getDate() + 7);
        break;
    }

    this.dateFrom = from.toISOString().split('T')[0];
    this.dateTo = to.toISOString().split('T')[0];
    this.applyFilters();
  }

  applyFilters(): void {
    this.backend.updateFilters({
      dateFrom: this.dateFrom || undefined,
      dateTo: this.dateTo || undefined
    });
  }

  // Has Space
  toggleHasSpace(): void {
    this.hasSpaceOnly.update(v => !v);
  }

  // Sort
  setSortOption(option: SortOption): void {
    this.sortOption.set(option);
  }

  // Clear all
  clearAllFilters(): void {
    this.searchQuery = '';
    this.dateFrom = '';
    this.dateTo = '';
    this.hasSpaceOnly.set(false);
    this.sortOption.set('date');
    this.backend.clearFilters();
  }

  // Helpers
  getCategoryIcon(category: ActivityCategory): string {
    return CATEGORY_META[category]?.icon || '✨';
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${day}.${month}. ${hours}:${minutes}`;
  }

  // Modal
  openGroup(group: ActivityGroup): void {
    this.selectedGroup.set(group);
    document.body.classList.add('modal-open');
  }

  closeGroup(): void {
    this.selectedGroup.set(null);
    document.body.classList.remove('modal-open');
  }
}