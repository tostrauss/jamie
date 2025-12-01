// src/app/services/favorites.service.ts
import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { tap, map, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { ActivityGroup } from '../models/types';

export interface Favorite {
  id: string;
  type: 'GROUP' | 'CLUB';
  groupId?: string;
  clubId?: string;
  createdAt: string;
  group?: ActivityGroup;
  club?: any; // Club type when implemented
}

export interface FavoritesResponse {
  favorites: Favorite[];
  total: number;
}

@Injectable({
  providedIn: 'root'
})
export class FavoritesService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/favorites`;

  // State
  private readonly _favorites = signal<Favorite[]>([]);
  private readonly _isLoading = signal(false);
  private readonly _favoriteIds = signal<Set<string>>(new Set());

  // Public readonly
  readonly favorites = this._favorites.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();

  // Computed
  readonly groupFavorites = computed(() => 
    this._favorites().filter(f => f.type === 'GROUP')
  );
  
  readonly clubFavorites = computed(() => 
    this._favorites().filter(f => f.type === 'CLUB')
  );

  readonly totalCount = computed(() => this._favorites().length);

  // ============================================
  // CHECK IF FAVORITE
  // ============================================
  isFavorite(id: string, type: 'GROUP' | 'CLUB'): boolean {
    const key = `${type}_${id}`;
    return this._favoriteIds().has(key);
  }

  // ============================================
  // LOAD ALL FAVORITES
  // ============================================
  loadFavorites(): Observable<FavoritesResponse> {
    this._isLoading.set(true);

    return this.http.get<FavoritesResponse>(this.apiUrl).pipe(
      tap(response => {
        this._favorites.set(response.favorites);
        this.updateFavoriteIds(response.favorites);
        this._isLoading.set(false);
      }),
      catchError(error => {
        this._isLoading.set(false);
        console.error('Error loading favorites:', error);
        return throwError(() => error);
      })
    );
  }

  // ============================================
  // ADD FAVORITE
  // ============================================
  addFavorite(id: string, type: 'GROUP' | 'CLUB'): Observable<Favorite> {
    const body = type === 'GROUP' ? { groupId: id } : { clubId: id };

    return this.http.post<Favorite>(this.apiUrl, { ...body, type }).pipe(
      tap(favorite => {
        this._favorites.update(favs => [...favs, favorite]);
        this._favoriteIds.update(ids => {
          const newIds = new Set(ids);
          newIds.add(`${type}_${id}`);
          return newIds;
        });
      }),
      catchError(error => {
        console.error('Error adding favorite:', error);
        return throwError(() => error);
      })
    );
  }

  // ============================================
  // REMOVE FAVORITE
  // ============================================
  removeFavorite(id: string, type: 'GROUP' | 'CLUB'): Observable<void> {
    const endpoint = type === 'GROUP' 
      ? `${this.apiUrl}/group/${id}` 
      : `${this.apiUrl}/club/${id}`;

    return this.http.delete<void>(endpoint).pipe(
      tap(() => {
        this._favorites.update(favs => 
          favs.filter(f => {
            if (type === 'GROUP') return f.groupId !== id;
            return f.clubId !== id;
          })
        );
        this._favoriteIds.update(ids => {
          const newIds = new Set(ids);
          newIds.delete(`${type}_${id}`);
          return newIds;
        });
      }),
      catchError(error => {
        console.error('Error removing favorite:', error);
        return throwError(() => error);
      })
    );
  }

  // ============================================
  // TOGGLE FAVORITE
  // ============================================
  toggleFavorite(id: string, type: 'GROUP' | 'CLUB'): Observable<boolean> {
    if (this.isFavorite(id, type)) {
      return this.removeFavorite(id, type).pipe(map(() => false));
    } else {
      return this.addFavorite(id, type).pipe(map(() => true));
    }
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================
  private updateFavoriteIds(favorites: Favorite[]): void {
    const ids = new Set<string>();
    favorites.forEach(f => {
      if (f.groupId) ids.add(`GROUP_${f.groupId}`);
      if (f.clubId) ids.add(`CLUB_${f.clubId}`);
    });
    this._favoriteIds.set(ids);
  }
}