// src/app/services/auth.service.ts
// Jamie App - Authentication Service

import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, throwError, of } from 'rxjs';
import { tap, catchError, finalize } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { User, AuthResponse, LoginRequest, RegisterRequest } from '../models/types';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  
  private readonly apiUrl = `${environment.apiUrl}/auth`;
  private readonly tokenKey = 'jamie_auth_token';
  private readonly userKey = 'jamie_user';

  // ============================================
  // STATE (Signals)
  // ============================================
  private readonly _currentUser = signal<User | null>(null);
  private readonly _isLoading = signal(false);
  private readonly _isInitialized = signal(false);

  // Public readonly signals
  readonly currentUser = this._currentUser.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly isInitialized = this._isInitialized.asReadonly();
  
  // Computed signals
  readonly isLoggedIn = computed(() => this._currentUser() !== null);
  readonly userId = computed(() => this._currentUser()?.id ?? null);
  readonly username = computed(() => this._currentUser()?.username ?? null);
  readonly userAvatar = computed(() => this._currentUser()?.avatarUrl ?? this.generateDefaultAvatar());

  constructor() {
    this.initializeAuth();
  }

  // ============================================
  // PUBLIC METHODS
  // ============================================

  register(credentials: RegisterRequest): Observable<AuthResponse> {
    this._isLoading.set(true);
    
    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, credentials).pipe(
      tap(response => this.handleAuthSuccess(response)),
      catchError(error => this.handleAuthError(error)),
      finalize(() => this._isLoading.set(false))
    );
  }

  login(credentials: LoginRequest): Observable<AuthResponse> {
    this._isLoading.set(true);
    
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, credentials).pipe(
      tap(response => this.handleAuthSuccess(response)),
      catchError(error => this.handleAuthError(error)),
      finalize(() => this._isLoading.set(false))
    );
  }

  logout(): void {
    this.clearAuthData();
    this._currentUser.set(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  hasValidToken(): boolean {
    const token = this.getToken();
    if (!token) return false;
    
    try {
      const payload = this.decodeToken(token);
      const expiresAt = payload.exp * 1000;
      return Date.now() < expiresAt;
    } catch {
      return false;
    }
  }

  refreshUser(): Observable<User | null> {
    if (!this.hasValidToken()) {
      return of(null);
    }

    return this.http.get<User>(`${environment.apiUrl}/users/me`).pipe(
      tap(user => {
        this._currentUser.set(user);
        this.storeUser(user);
      }),
      catchError(() => {
        this.logout();
        return of(null);
      })
    );
  }

  updateProfile(data: Partial<User>): Observable<User> {
    return this.http.put<User>(`${environment.apiUrl}/users/me`, data).pipe(
      tap(user => {
        this._currentUser.set(user);
        this.storeUser(user);
      })
    );
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  private initializeAuth(): void {
    const token = this.getToken();
    const storedUser = this.getStoredUser();

    if (token && storedUser && this.hasValidToken()) {
      this._currentUser.set(storedUser);
      this.refreshUser().subscribe();
    } else if (token) {
      this.refreshUser().subscribe({
        error: () => this.clearAuthData()
      });
    }
    
    this._isInitialized.set(true);
  }

  private handleAuthSuccess(response: AuthResponse): void {
    this.storeToken(response.token);
    this.storeUser(response.user);
    this._currentUser.set(response.user);
    this.router.navigate(['/']);
  }

  private handleAuthError(error: HttpErrorResponse): Observable<never> {
    let message = 'Ein unbekannter Fehler ist aufgetreten';
    
    if (error.error?.error) {
      message = error.error.error;
    } else if (error.status === 401) {
      message = 'Ungültige Zugangsdaten';
    } else if (error.status === 409) {
      message = 'Email oder Username bereits vergeben';
    } else if (error.status === 0) {
      message = 'Keine Verbindung zum Server';
    }
    
    return throwError(() => ({ message, status: error.status }));
  }

  private decodeToken(token: string): { userId: string; exp: number } {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload));
  }

  private storeToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
  }

  private storeUser(user: User): void {
    localStorage.setItem(this.userKey, JSON.stringify(user));
  }

  private getStoredUser(): User | null {
    const stored = localStorage.getItem(this.userKey);
    if (!stored) return null;
    
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }

  private clearAuthData(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
  }

  private generateDefaultAvatar(): string {
    const seed = Math.floor(Math.random() * 10000);
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
  }
}