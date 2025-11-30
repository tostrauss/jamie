// src/app/pages/home/home.component.ts
// Jamie App - Home Page Component

import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { JoinModalComponent } from '../../shared/components/modal/join-modal/join-modal.component';
import { CreateModalComponent } from '../../shared/components/modal/create-modal/create-modal.component';
import { SkeletonCardComponent } from '../../shared/components/skeleton/skeleton-card.component';
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
    SkeletonCardComponent
  ],
  templateUrl: './home.component.html'
})
export class HomeComponent implements OnInit {
  private readonly backend = inject(BackendService);
  readonly auth = inject(AuthService);

  // State
  selectedGroup = signal<ActivityGroup | null>(null);
  isCreateModalOpen = signal(false);
  searchQuery = signal('');
  showCitySelector = signal(false);

  // Data from services
  readonly categories = this.backend.getCategories();
  readonly groups = this.backend.filteredGroups;
  readonly isLoading = this.backend.isLoadingGroups;
  readonly selectedCity = this.backend.selectedCity;
  readonly cities = CITIES;

  // Computed
  readonly hasGroups = computed(() => this.groups().length > 0);
  readonly greeting = computed(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Guten Morgen';
    if (hour < 18) return 'Guten Tag';
    return 'Guten Abend';
  });

  ngOnInit(): void {
    this.backend.loadGroups();
  }

  // Search handling with debounce
  private searchTimeout: ReturnType<typeof setTimeout> | null = null;
  
  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
    
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    
    this.searchTimeout = setTimeout(() => {
      this.backend.setFilters({ search: value || undefined });
    }, 300);
  }

  // City selection
  selectCity(city: string): void {
    this.backend.setCity(city);
    this.showCitySelector.set(false);
  }

  // Category filter
  filterByCategory(category: Category): void {
    const currentFilters = this.backend['_activeFilters']();
    if (currentFilters.category === category.id) {
      this.backend.setFilters({ ...currentFilters, category: undefined });
    } else {
      this.backend.setFilters({ ...currentFilters, category: category.id });
    }
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

  // Refresh data
  refresh(): void {
    this.backend.loadGroups();
  }

  // Track by for ngFor optimization
  trackByGroupId(index: number, group: ActivityGroup): string {
    return group.id;
  }

  trackByCategoryId(index: number, category: Category): string {
    return category.id;
  }
}