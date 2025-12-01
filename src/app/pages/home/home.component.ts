// src/app/pages/home/home.component.ts
import { Component, signal, computed, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { JoinModalComponent } from '../../shared/components/modal/join-modal/join-modal.component';
import { CreateModalComponent } from '../../shared/components/modal/create-modal/create-modal.component';
import { SkeletonCardComponent } from '../../shared/components/skeleton/skeleton-card.component';
import { GroupCardComponent } from '../../shared/components/group-card/group-card.component';
import { ActivityGroup, Category, CITIES } from '../../models/types';
import { BackendService } from '../../services/backend.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    JoinModalComponent,
    CreateModalComponent,
    SkeletonCardComponent,
    GroupCardComponent
  ],
  template: `
    <div class="min-h-screen bg-[#1c1c2e] text-white pb-28 relative overflow-hidden">
      
      <!-- Background Gradients -->
      <div class="fixed inset-0 pointer-events-none overflow-hidden">
        <div class="absolute top-[-20%] left-[-20%] w-[600px] h-[600px] bg-purple-600/15 rounded-full blur-[150px]"></div>
        <div class="absolute bottom-[-20%] right-[-20%] w-[600px] h-[600px] bg-orange-500/10 rounded-full blur-[150px]"></div>
      </div>

      <!-- Header -->
      <header class="px-5 pt-safe-top relative z-20">
        <div class="flex justify-between items-center pt-12 pb-4">
          <div>
            <p class="text-gray-400 text-sm">{{ greeting() }},</p>
            <h1 class="text-xl font-bold">
              {{ auth.username() || 'Willkommen' }} 👋
            </h1>
          </div>
          
          <!-- City Selector -->
          <button 
            (click)="showCitySelector.set(!showCitySelector())"
            class="flex items-center gap-2 bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl border border-white/10 transition-all">
            <svg class="w-4 h-4 text-[#ff7043]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
            <span class="text-sm font-medium">{{ selectedCity() }}</span>
            <svg class="w-4 h-4 text-gray-400 transition-transform" 
                 [class.rotate-180]="showCitySelector()"
                 fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
            </svg>
          </button>
        </div>

        <!-- City Dropdown -->
        @if (showCitySelector()) {
          <div class="absolute top-24 right-5 bg-[#2e2e42] rounded-2xl border border-white/10 shadow-2xl overflow-hidden z-50 animate-slide-down min-w-[180px]">
            @for (city of cities; track city) {
              <button 
                (click)="selectCity(city)"
                class="w-full px-4 py-3 text-left text-sm hover:bg-white/5 transition-colors flex items-center gap-3"
                [class.bg-white/5]="selectedCity() === city"
                [class.text-[#ff7043]]="selectedCity() === city">
                @if (selectedCity() === city) {
                  <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                  </svg>
                } @else {
                  <span class="w-4"></span>
                }
                {{ city }}
              </button>
            }
          </div>
        }

        <!-- Search Bar -->
        <div class="relative group mb-6">
          <input 
            type="text" 
            placeholder="Aktivität suchen..." 
            [value]="searchQuery()"
            (input)="onSearchInput($event)"
            class="w-full bg-[#2e2e42] text-gray-200 placeholder-gray-500 rounded-2xl py-3.5 pl-12 pr-4 border border-white/5 focus:outline-none focus:border-[#ff7043]/50 focus:bg-[#34344b] transition-all shadow-lg">
          <svg class="w-5 h-5 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2 transition-colors group-focus-within:text-[#ff7043]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          @if (searchQuery()) {
            <button 
              (click)="clearSearch()"
              class="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          }
        </div>
      </header>

      <!-- Categories -->
      <section class="mb-6 overflow-x-auto no-scrollbar pl-5 relative z-10">
        <div class="flex gap-3 pr-5">
          @for (cat of categories(); track cat.id) {
            <button 
              (click)="toggleCategory(cat)"
              class="flex flex-col items-center gap-2 flex-shrink-0 cursor-pointer group">
              <div class="w-[68px] h-[68px] rounded-2xl overflow-hidden border-2 transition-all relative shadow-md"
                   [class.border-[#ff7043]]="activeCategory() === cat.id"
                   [class.border-transparent]="activeCategory() !== cat.id"
                   [class.scale-105]="activeCategory() === cat.id">
                <img [src]="cat.iconUrl" 
                     [alt]="cat.name"
                     class="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                     loading="lazy">
                <div class="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
                <span class="absolute bottom-1 left-1/2 -translate-x-1/2 text-lg">{{ cat.icon }}</span>
              </div>
              <span class="text-[11px] font-medium transition-colors"
                    [class.text-white]="activeCategory() === cat.id"
                    [class.text-gray-400]="activeCategory() !== cat.id">
                {{ cat.name }}
              </span>
            </button>
          }
        </div>
      </section>

      <!-- Section Header -->
      <div class="px-5 mb-4 flex justify-between items-end relative z-10">
        <div>
          <h2 class="text-lg font-bold text-white">In deiner Nähe</h2>
          <p class="text-xs text-gray-500">
            {{ filteredGroups().length }} Aktivität{{ filteredGroups().length !== 1 ? 'en' : '' }} gefunden
          </p>
        </div>
        <button 
          (click)="refresh()"
          [disabled]="isLoading()"
          class="text-xs text-[#ff7043] font-semibold hover:text-[#ff8a65] transition-colors flex items-center gap-1 disabled:opacity-50">
          <svg class="w-3.5 h-3.5" [class.animate-spin]="isLoading()" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
          Aktualisieren
        </button>
      </div>

      <!-- Main Content -->
      <main class="px-4 relative z-10 pb-4">
        
        <!-- Loading State -->
        @if (isLoading()) {
          <div class="grid grid-cols-2 gap-3">
            @for (i of [1,2,3,4]; track i) {
              <app-skeleton-card />
            }
          </div>
        }
        
        <!-- Empty State -->
        @else if (!hasGroups()) {
          <div class="flex flex-col items-center justify-center py-16 text-center">
            <div class="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-4">
              <svg class="w-10 h-10 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
              </svg>
            </div>
            <h3 class="text-lg font-semibold mb-2">Keine Aktivitäten gefunden</h3>
            <p class="text-sm text-gray-400 mb-6 max-w-[250px]">
              @if (searchQuery()) {
                Keine Ergebnisse für "{{ searchQuery() }}". Versuche einen anderen Suchbegriff.
              } @else if (activeCategory()) {
                Keine {{ getCategoryName(activeCategory()!) }}-Aktivitäten in {{ selectedCity() }}.
              } @else {
                Sei der Erste und erstelle eine Aktivität in {{ selectedCity() }}!
              }
            </p>
            <button 
              (click)="openCreateModal()"
              class="btn-jamie btn-primary px-6 py-3">
              <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
              </svg>
              Aktivität erstellen
            </button>
          </div>
        }
        
        <!-- Groups Grid -->
        @else {
          <div class="grid grid-cols-2 gap-3">
            @for (group of filteredGroups(); track group.id) {
              <app-group-card 
                [group]="group"
                (click)="openGroup(group)" />
            }
          </div>
        }
      </main>

      <!-- City Selector Backdrop -->
      @if (showCitySelector()) {
        <div 
          class="fixed inset-0 z-30" 
          (click)="showCitySelector.set(false)">
        </div>
      }

      <!-- Join Modal -->
      @if (selectedGroup()) {
        <app-join-modal 
          [group]="selectedGroup()!" 
          (close)="closeGroup()" />
      }
      
      <!-- Create Modal -->
      @if (isCreateModalOpen()) {
        <app-create-modal 
          (close)="closeCreateModal()"
          (created)="onGroupCreated()" />
      }
    </div>
  `
})
export class HomeComponent implements OnInit, OnDestroy {
  private readonly backend = inject(BackendService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroy$ = new Subject<void>();
  
  readonly auth = inject(AuthService);

  // State
  selectedGroup = signal<ActivityGroup | null>(null);
  isCreateModalOpen = signal(false);
  searchQuery = signal('');
  showCitySelector = signal(false);

  // From Backend Service
  readonly categories = this.backend.getCategories();
  readonly filteredGroups = this.backend.filteredGroups;
  readonly isLoading = this.backend.isLoadingGroups;
  readonly selectedCity = this.backend.selectedCity;
  readonly activeFilters = this.backend.activeFilters;
  readonly cities = CITIES;

  // Computed
  readonly hasGroups = computed(() => this.filteredGroups().length > 0);
  readonly activeCategory = computed(() => this.activeFilters().category);
  
  readonly greeting = computed(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Guten Morgen';
    if (hour < 18) return 'Guten Tag';
    return 'Guten Abend';
  });

  // Search debounce
  private searchTimeout: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    // Handle query params (e.g., ?create=true from bottom nav)
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        if (params['create'] === 'true') {
          this.openCreateModal();
          // Clear the query param
          this.router.navigate([], { 
            queryParams: { create: null },
            queryParamsHandling: 'merge'
          });
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
  }

  // Search
  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
    
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    
    this.searchTimeout = setTimeout(() => {
      this.backend.updateFilters({ search: value || undefined });
    }, 300);
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.backend.updateFilters({ search: undefined });
  }

  // City
  selectCity(city: string): void {
    this.backend.setCity(city);
    this.showCitySelector.set(false);
  }

  // Category
  toggleCategory(category: Category): void {
    this.backend.toggleCategoryFilter(category.id);
  }

  getCategoryName(categoryId: string): string {
    const cat = this.categories().find(c => c.id === categoryId);
    return cat?.name || categoryId;
  }

  // Modal handling
  openGroup(group: ActivityGroup): void {
    this.selectedGroup.set(group);
    document.body.classList.add('modal-open');
  }

  closeGroup(): void {
    this.selectedGroup.set(null);
    document.body.classList.remove('modal-open');
  }

  openCreateModal(): void {
    this.isCreateModalOpen.set(true);
    document.body.classList.add('modal-open');
  }

  closeCreateModal(): void {
    this.isCreateModalOpen.set(false);
    document.body.classList.remove('modal-open');
  }

  onGroupCreated(): void {
    this.closeCreateModal();
    // Optionally scroll to top to see new group
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Refresh
  refresh(): void {
    this.backend.loadGroups();
  }
}