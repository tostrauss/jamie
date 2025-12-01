// src/app/services/backend.service.ts
// Jamie App - Backend API Service

import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap, map, catchError, finalize } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { SocketService } from './socket.service'; // Dein neuer Socket Service
import {
  ActivityGroup,
  CreateGroupRequest,
  UpdateGroupRequest,
  JoinGroupRequest,
  Category,
  GroupFilters,
  Participant,
  Message,
  Notification,
  PaginatedResponse,
  CATEGORY_META,
  ActivityCategory
} from '../models/types';

@Injectable({
  providedIn: 'root'
})
export class BackendService {
  private readonly http = inject(HttpClient);
  private readonly socket = inject(SocketService);
  private readonly apiUrl = environment.apiUrl;

  // ============================================
  // STATE (Signals)
  // ============================================
  private readonly _groups = signal<ActivityGroup[]>([]);
  private readonly _isLoadingGroups = signal(false);
  private readonly _selectedCity = signal<string>('Wien');
  private readonly _activeFilters = signal<GroupFilters>({});
  private readonly _notifications = signal<Notification[]>([]);

  // Public readonly signals
  readonly groups = this._groups.asReadonly();
  readonly isLoadingGroups = this._isLoadingGroups.asReadonly();
  readonly selectedCity = this._selectedCity.asReadonly();
  readonly notifications = this._notifications.asReadonly();
  
  // NEU: Wir machen die Filter öffentlich lesbar für die Komponenten!
  readonly activeFilters = this._activeFilters.asReadonly();

  // Categories
  readonly categories = signal<Category[]>(
    Object.entries(CATEGORY_META).map(([id, meta]) => ({
      id: id as ActivityCategory,
      ...meta
    }))
  );

  // Computed signals
  readonly filteredGroups = computed(() => {
    const groups = this._groups();
    const filters = this._activeFilters();
    const city = this._selectedCity();
    
    return groups.filter(group => {
      if (city && group.city !== city) return false;
      if (filters.category && group.category !== filters.category) return false;
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesTitle = group.title.toLowerCase().includes(searchLower);
        const matchesDesc = group.description.toLowerCase().includes(searchLower);
        if (!matchesTitle && !matchesDesc) return false;
      }
      if (filters.hasSpace && group.currentMembers >= group.maxMembers) return false;
      if (filters.dateFrom && new Date(group.date) < new Date(filters.dateFrom)) return false;
      if (filters.dateTo && new Date(group.date) > new Date(filters.dateTo)) return false;
      return true;
    });
  });

  readonly unreadNotificationCount = computed(() => 
    this._notifications().filter(n => !n.isRead).length
  );

  constructor() {
    this.loadGroups();
    this.setupRealtimeUpdates();
  }

  // ============================================
  // REALTIME
  // ============================================
  private setupRealtimeUpdates(): void {
    // Verbindung aufbauen
    this.socket.connect();

    // Hören auf neue Gruppen
    this.socket.on<ActivityGroup>('group_created').subscribe(newGroup => {
      console.log('⚡ Realtime: New Group received', newGroup);
      this._groups.update(current => [newGroup, ...current]);
    });
  }

  // ============================================
  // GROUP METHODS
  // ============================================

  loadGroups(): void {
    this._isLoadingGroups.set(true);
    
    this.http.get<ActivityGroup[]>(`${this.apiUrl}/groups`).pipe(
      map(groups => this.transformGroups(groups)),
      catchError(error => {
        console.error('Failed to load groups:', error);
        return of([]);
      }),
      finalize(() => this._isLoadingGroups.set(false))
    ).subscribe(groups => this._groups.set(groups));
  }

  getGroups(filters?: GroupFilters): Observable<ActivityGroup[]> {
    let params = new HttpParams();
    
    if (filters?.category) params = params.set('category', filters.category);
    if (filters?.city) params = params.set('city', filters.city);
    if (filters?.search) params = params.set('search', filters.search);
    
    return this.http.get<ActivityGroup[]>(`${this.apiUrl}/groups`, { params }).pipe(
      map(groups => this.transformGroups(groups))
    );
  }

  getGroupById(id: string): Observable<ActivityGroup> {
    return this.http.get<ActivityGroup>(`${this.apiUrl}/groups/${id}`).pipe(
      map(group => this.transformGroup(group))
    );
  }

  createGroup(data: CreateGroupRequest): Observable<ActivityGroup> {
    const groupData = {
      ...data,
      avatarSeeds: this.generateAvatarSeeds(3)
    };

    return this.http.post<ActivityGroup>(`${this.apiUrl}/groups`, groupData).pipe(
      map(group => this.transformGroup(group)),
      tap(newGroup => {
        // Optimistic update nicht zwingend nötig wegen Socket, aber sicherer
        // this._groups.update(groups => [newGroup, ...groups]); 
      })
    );
  }

  updateGroup(id: string, data: UpdateGroupRequest): Observable<ActivityGroup> {
    return this.http.put<ActivityGroup>(`${this.apiUrl}/groups/${id}`, data).pipe(
      map(group => this.transformGroup(group)),
      tap(updated => {
        this._groups.update(groups => 
          groups.map(g => g.id === id ? updated : g)
        );
      })
    );
  }

  deleteGroup(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/groups/${id}`).pipe(
      tap(() => {
        this._groups.update(groups => groups.filter(g => g.id !== id));
      })
    );
  }

  joinGroup(groupId: string, request?: JoinGroupRequest): Observable<Participant> {
    return this.http.post<Participant>(`${this.apiUrl}/groups/${groupId}/join`, request || {}).pipe(
      tap(() => {
        this._groups.update(groups => 
          groups.map(g => g.id === groupId ? { ...g, isPending: true } : g)
        );
      })
    );
  }

  leaveGroup(groupId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/groups/${groupId}/leave`).pipe(
      tap(() => {
        this._groups.update(groups => 
          groups.map(g => {
            if (g.id === groupId) {
              return { 
                ...g, 
                isMember: false, 
                isPending: false,
                currentMembers: Math.max(0, g.currentMembers - 1)
              };
            }
            return g;
          })
        );
      })
    );
  }

  // ============================================
  // FILTER METHODS
  // ============================================

  setCity(city: string): void {
    this._selectedCity.set(city);
  }

  setFilters(filters: GroupFilters): void {
    this._activeFilters.set(filters);
  }

  clearFilters(): void {
    this._activeFilters.set({});
  }

  getCategories() {
    return this.categories;
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private transformGroups(groups: ActivityGroup[]): ActivityGroup[] {
    return groups.map(g => this.transformGroup(g));
  }

  private transformGroup(group: any): ActivityGroup {
    return {
      ...group,
      currentMembers: group.currentMembers ?? (group.participants?.length ?? 0) + 1,
      avatarSeeds: group.avatarSeeds ?? this.generateAvatarSeeds(3),
      imageUrl: group.imageUrl ?? this.getDefaultImageForCategory(group.category)
    };
  }

  private generateAvatarSeeds(count: number): number[] {
    return Array.from({ length: count }, () => Math.floor(Math.random() * 10000));
  }

  private getDefaultImageForCategory(category: ActivityCategory): string {
    const images: Record<ActivityCategory, string> = {
      SPORT: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=600',
      PARTY: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600',
      KULTUR: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=600',
      NATUR: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=600',
      SOCIAL: 'https://images.unsplash.com/photo-1543807535-eceef0bc6599?w=600',
      FOOD: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600',
      TRAVEL: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=600',
      GAMING: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=600',
      OTHER: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=600'
    };
    return images[category] || images.OTHER;
  }
}