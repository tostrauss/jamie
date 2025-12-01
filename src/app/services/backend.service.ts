// src/app/services/backend.service.ts
import { Injectable, inject, signal, computed, OnDestroy } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, Subject, of, throwError } from 'rxjs';
import { tap, map, catchError, finalize, takeUntil, retry } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { SocketService } from './socket.service';
import {
  ActivityGroup,
  CreateGroupRequest,
  UpdateGroupRequest,
  JoinGroupRequest,
  Category,
  GroupFilters,
  Participant,
  Notification,
  CATEGORY_META,
  ActivityCategory,
  CITIES
} from '../models/types';

@Injectable({
  providedIn: 'root'
})
export class BackendService implements OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly socket = inject(SocketService);
  private readonly apiUrl = environment.apiUrl;
  private readonly destroy$ = new Subject<void>();

  // ============================================
  // STATE
  // ============================================
  private readonly _groups = signal<ActivityGroup[]>([]);
  private readonly _isLoadingGroups = signal(false);
  private readonly _selectedCity = signal<string>(this.getInitialCity());
  private readonly _activeFilters = signal<GroupFilters>({});
  private readonly _notifications = signal<Notification[]>([]);
  private readonly _error = signal<string | null>(null);

  // Public readonly signals
  readonly groups = this._groups.asReadonly();
  readonly isLoadingGroups = this._isLoadingGroups.asReadonly();
  readonly selectedCity = this._selectedCity.asReadonly();
  readonly activeFilters = this._activeFilters.asReadonly();
  readonly notifications = this._notifications.asReadonly();
  readonly error = this._error.asReadonly();

  // Socket connection status (delegated)
  readonly socketStatus = this.socket.status;
  readonly isSocketConnected = this.socket.isConnected;

  // Categories (static)
  readonly categories = signal<Category[]>(
    Object.entries(CATEGORY_META).map(([id, meta]) => ({
      id: id as ActivityCategory,
      ...meta
    }))
  );

  // Computed: Filtered groups
  readonly filteredGroups = computed(() => {
    const groups = this._groups();
    const filters = this._activeFilters();
    const city = this._selectedCity();

    return groups.filter(group => {
      // City filter
      if (city && group.city.toLowerCase() !== city.toLowerCase()) {
        return false;
      }
      
      // Category filter
      if (filters.category && group.category !== filters.category) {
        return false;
      }
      
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesTitle = group.title.toLowerCase().includes(searchLower);
        const matchesDesc = group.description?.toLowerCase().includes(searchLower);
        const matchesLocation = group.location.toLowerCase().includes(searchLower);
        if (!matchesTitle && !matchesDesc && !matchesLocation) {
          return false;
        }
      }
      
      // Has space filter
      if (filters.hasSpace && group.currentMembers >= group.maxMembers) {
        return false;
      }
      
      // Date filters
      if (filters.dateFrom && new Date(group.date) < new Date(filters.dateFrom)) {
        return false;
      }
      if (filters.dateTo && new Date(group.date) > new Date(filters.dateTo)) {
        return false;
      }
      
      return true;
    });
  });

  // Computed: Notification count
  readonly unreadNotificationCount = computed(() =>
    this._notifications().filter(n => !n.isRead).length
  );

  // Computed: Has groups
  readonly hasGroups = computed(() => this._groups().length > 0);

  constructor() {
    this.loadGroups();
    this.setupRealtimeUpdates();
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  private getInitialCity(): string {
    // Try to get from localStorage
    const saved = localStorage.getItem('jamie_selected_city');
    if (saved && CITIES.includes(saved as any)) {
      return saved;
    }
    return 'Wien';
  }

  private setupRealtimeUpdates(): void {
    // Connect socket
    this.socket.connect();

    // New group created
    this.socket.on<ActivityGroup>('group_created')
      .pipe(takeUntil(this.destroy$))
      .subscribe(newGroup => {
        console.log('⚡ Realtime: Group created', newGroup.title);
        this._groups.update(groups => {
          // Avoid duplicates
          if (groups.some(g => g.id === newGroup.id)) {
            return groups;
          }
          return [this.transformGroup(newGroup), ...groups];
        });
      });

    // Group updated
    this.socket.on<ActivityGroup>('group_updated')
      .pipe(takeUntil(this.destroy$))
      .subscribe(updatedGroup => {
        console.log('⚡ Realtime: Group updated', updatedGroup.title);
        this._groups.update(groups =>
          groups.map(g => g.id === updatedGroup.id 
            ? this.transformGroup(updatedGroup) 
            : g
          )
        );
      });

    // Group deleted
    this.socket.on<{ id: string }>('group_deleted')
      .pipe(takeUntil(this.destroy$))
      .subscribe(({ id }) => {
        console.log('⚡ Realtime: Group deleted', id);
        this._groups.update(groups => groups.filter(g => g.id !== id));
      });

    // Member joined a group
    this.socket.on<{ groupId: string; member: any }>('member_joined')
      .pipe(takeUntil(this.destroy$))
      .subscribe(({ groupId, member }) => {
        console.log('⚡ Realtime: Member joined', groupId);
        this._groups.update(groups =>
          groups.map(g => {
            if (g.id === groupId) {
              return {
                ...g,
                currentMembers: g.currentMembers + 1,
                avatarSeeds: [...g.avatarSeeds, Math.floor(Math.random() * 10000)]
              };
            }
            return g;
          })
        );
      });

    // Member left a group
    this.socket.on<{ userId: string; groupId: string }>('member_left')
      .pipe(takeUntil(this.destroy$))
      .subscribe(({ groupId }) => {
        console.log('⚡ Realtime: Member left', groupId);
        this._groups.update(groups =>
          groups.map(g => {
            if (g.id === groupId) {
              return {
                ...g,
                currentMembers: Math.max(1, g.currentMembers - 1)
              };
            }
            return g;
          })
        );
      });

    // Join request response (for current user)
    this.socket.on<{ groupId: string; status: string; groupTitle: string }>('request_response')
      .pipe(takeUntil(this.destroy$))
      .subscribe(({ groupId, status, groupTitle }) => {
        console.log('⚡ Realtime: Request response', status);
        this._groups.update(groups =>
          groups.map(g => {
            if (g.id === groupId) {
              return {
                ...g,
                isMember: status === 'APPROVED',
                isPending: false
              };
            }
            return g;
          })
        );
      });
  }

  // ============================================
  // GROUP API METHODS
  // ============================================

  loadGroups(): void {
    if (this._isLoadingGroups()) return;

    this._isLoadingGroups.set(true);
    this._error.set(null);

    this.http.get<{ data: ActivityGroup[]; total: number }>(`${this.apiUrl}/groups`)
      .pipe(
        retry(2),
        map(response => response.data || response),
        map(groups => Array.isArray(groups) ? groups : []),
        map(groups => this.transformGroups(groups)),
        catchError(error => this.handleError(error, [])),
        finalize(() => this._isLoadingGroups.set(false))
      )
      .subscribe(groups => this._groups.set(groups));
  }

  getGroupById(id: string): Observable<ActivityGroup> {
    return this.http.get<ActivityGroup>(`${this.apiUrl}/groups/${id}`).pipe(
      map(group => this.transformGroup(group)),
      catchError(error => this.handleError(error))
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
        // Optimistic update (socket will also push, but this is faster)
        this._groups.update(groups => {
          if (groups.some(g => g.id === newGroup.id)) {
            return groups;
          }
          return [newGroup, ...groups];
        });
      }),
      catchError(error => this.handleError(error))
    );
  }

  updateGroup(id: string, data: UpdateGroupRequest): Observable<ActivityGroup> {
    return this.http.put<ActivityGroup>(`${this.apiUrl}/groups/${id}`, data).pipe(
      map(group => this.transformGroup(group)),
      tap(updated => {
        this._groups.update(groups =>
          groups.map(g => g.id === id ? updated : g)
        );
      }),
      catchError(error => this.handleError(error))
    );
  }

  deleteGroup(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/groups/${id}`).pipe(
      tap(() => {
        this._groups.update(groups => groups.filter(g => g.id !== id));
      }),
      catchError(error => this.handleError(error))
    );
  }

  joinGroup(groupId: string, request?: JoinGroupRequest): Observable<Participant> {
    return this.http.post<Participant>(
      `${this.apiUrl}/groups/${groupId}/join`,
      request || {}
    ).pipe(
      tap(() => {
        this._groups.update(groups =>
          groups.map(g => g.id === groupId ? { ...g, isPending: true } : g)
        );
      }),
      catchError(error => this.handleError(error))
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
                currentMembers: Math.max(1, g.currentMembers - 1)
              };
            }
            return g;
          })
        );
      }),
      catchError(error => this.handleError(error))
    );
  }

  getParticipants(groupId: string): Observable<{ participants: Participant[]; isCreator: boolean }> {
    return this.http.get<{ participants: Participant[]; isCreator: boolean }>(
      `${this.apiUrl}/groups/${groupId}/participants`
    ).pipe(
      catchError(error => this.handleError(error))
    );
  }

  updateParticipantStatus(
    groupId: string,
    participantId: string,
    status: 'APPROVED' | 'REJECTED'
  ): Observable<Participant> {
    return this.http.put<Participant>(
      `${this.apiUrl}/groups/${groupId}/participants/${participantId}`,
      { status }
    ).pipe(
      catchError(error => this.handleError(error))
    );
  }

  // ============================================
  // FILTER METHODS
  // ============================================

  setCity(city: string): void {
    this._selectedCity.set(city);
    localStorage.setItem('jamie_selected_city', city);
  }

  setFilters(filters: GroupFilters): void {
    this._activeFilters.set(filters);
  }

  updateFilters(updates: Partial<GroupFilters>): void {
    this._activeFilters.update(current => ({ ...current, ...updates }));
  }

  clearFilters(): void {
    this._activeFilters.set({});
  }

  toggleCategoryFilter(category: ActivityCategory): void {
    this._activeFilters.update(current => ({
      ...current,
      category: current.category === category ? undefined : category
    }));
  }

  // ============================================
  // NOTIFICATION METHODS
  // ============================================

  loadNotifications(): void {
    this.http.get<Notification[]>(`${this.apiUrl}/notifications`)
      .pipe(catchError(() => of([])))
      .subscribe(notifications => this._notifications.set(notifications));
  }

  markNotificationRead(id: string): void {
    this.http.put(`${this.apiUrl}/notifications/${id}/read`, {})
      .pipe(catchError(() => of(null)))
      .subscribe(() => {
        this._notifications.update(list =>
          list.map(n => n.id === id ? { ...n, isRead: true } : n)
        );
      });
  }

  markAllNotificationsRead(): void {
    this.http.put(`${this.apiUrl}/notifications/read-all`, {})
      .pipe(catchError(() => of(null)))
      .subscribe(() => {
        this._notifications.update(list =>
          list.map(n => ({ ...n, isRead: true }))
        );
      });
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  getCategories() {
    return this.categories;
  }

  private transformGroups(groups: any[]): ActivityGroup[] {
    return groups.map(g => this.transformGroup(g));
  }

  private transformGroup(group: any): ActivityGroup {
    return {
      ...group,
      currentMembers: group.currentMembers ?? (group.participants?.length ?? 0) + 1,
      avatarSeeds: group.avatarSeeds?.length 
        ? group.avatarSeeds 
        : this.generateAvatarSeeds(Math.min(group.currentMembers || 1, 4)),
      imageUrl: group.imageUrl || this.getDefaultImageForCategory(group.category),
      description: group.description || ''
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

  private handleError<T>(error: HttpErrorResponse, fallback?: T): Observable<T> {
    let message = 'Ein Fehler ist aufgetreten';

    if (error.error?.error) {
      message = error.error.error;
    } else if (error.status === 0) {
      message = 'Keine Verbindung zum Server';
    } else if (error.status === 401) {
      message = 'Nicht autorisiert';
    } else if (error.status === 403) {
      message = 'Keine Berechtigung';
    } else if (error.status === 404) {
      message = 'Nicht gefunden';
    } else if (error.status >= 500) {
      message = 'Serverfehler';
    }

    this._error.set(message);
    console.error('API Error:', message, error);

    if (fallback !== undefined) {
      return of(fallback);
    }
    
    return throwError(() => ({ message, status: error.status }));
  }

  // ============================================
  // CLEANUP
  // ============================================

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}