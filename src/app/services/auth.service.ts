// src/app/services/auth.service.ts
import { Injectable, inject, signal, computed, OnDestroy } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, Subject, throwError, of, BehaviorSubject } from 'rxjs';
import { catchError, tap, map, finalize, takeUntil } from 'rxjs/operators';
import { environment } from '../../environments/environment';

// ============================================
// TYPES
// ============================================
export interface User {
  id: string;
  email: string;
  username: string;
  avatarUrl?: string;
  bio?: string;
  city?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  city?: string;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

export interface UpdateProfileRequest {
  username?: string;
  bio?: string;
  city?: string;
  avatarUrl?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

// ============================================
// STORAGE KEYS
// ============================================
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'jamie_access_token',
  REFRESH_TOKEN: 'jamie_refresh_token',
  USER: 'jamie_user',
  TOKEN_EXPIRY: 'jamie_token_expiry'
} as const;

// ============================================
// SERVICE
// ============================================
@Injectable({
  providedIn: 'root'
})
export class AuthService implements OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly destroy$ = new Subject<void>();

  private readonly API_URL = `${environment.apiUrl}/auth`;

  // State
  private readonly _user = signal<User | null>(null);
  private readonly _isLoading = signal<boolean>(false);
  private readonly _isInitialized = signal<boolean>(false);

  // Token refresh
  private refreshTokenTimeout?: ReturnType<typeof setTimeout>;
  private isRefreshing = false;
  private refreshTokenSubject = new BehaviorSubject<string | null>(null);

  // Public readonly signals
  readonly user = this._user.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly isInitialized = this._isInitialized.asReadonly();

  // Computed
  readonly isAuthenticated = computed(() => !!this._user() && !!this.getAccessToken());
  readonly userId = computed(() => this._user()?.id ?? null);
  readonly username = computed(() => this._user()?.username ?? null);
  readonly userEmail = computed(() => this._user()?.email ?? null);
  readonly userAvatar = computed(() => 
    this._user()?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${this._user()?.id || 'default'}`
  );
  readonly userCity = computed(() => this._user()?.city ?? null);

  constructor() {
    this.initializeAuth();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.stopRefreshTokenTimer();
  }

  // ============================================
  // INITIALIZATION
  // ============================================
  private initializeAuth(): void {
    try {
      const storedUser = localStorage.getItem(STORAGE_KEYS.USER);
      const accessToken = this.getAccessToken();
      const tokenExpiry = localStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRY);

      if (storedUser && accessToken) {
        const user = JSON.parse(storedUser) as User;
        this._user.set(user);

        // Check if token is expired
        if (tokenExpiry) {
          const expiryTime = parseInt(tokenExpiry, 10);
          if (Date.now() >= expiryTime) {
            // Token expired, try to refresh
            this.refreshToken().subscribe({
              error: () => this.logout(false)
            });
          } else {
            // Set up refresh timer
            this.startRefreshTokenTimer(expiryTime - Date.now());
          }
        }
      }
    } catch (error) {
      console.error('Error initializing auth:', error);
      this.clearStorage();
    } finally {
      this._isInitialized.set(true);
    }
  }

  // ============================================
  // AUTH METHODS
  // ============================================

  /**
   * Login with email and password
   */
  login(credentials: LoginRequest): Observable<AuthResponse> {
    this._isLoading.set(true);

    return this.http.post<AuthResponse>(`${this.API_URL}/login`, credentials).pipe(
      tap(response => this.handleAuthSuccess(response)),
      catchError(error => this.handleAuthError(error)),
      finalize(() => this._isLoading.set(false))
    );
  }

  /**
   * Register new user
   */
  register(data: RegisterRequest): Observable<AuthResponse> {
    this._isLoading.set(true);

    return this.http.post<AuthResponse>(`${this.API_URL}/register`, data).pipe(
      tap(response => this.handleAuthSuccess(response)),
      catchError(error => this.handleAuthError(error)),
      finalize(() => this._isLoading.set(false))
    );
  }

  /**
   * Logout user
   */
  logout(navigate: boolean = true): void {
    const refreshToken = this.getRefreshToken();

    // Call logout endpoint (optional, to invalidate refresh token)
    if (refreshToken) {
      this.http.post(`${this.API_URL}/logout`, { refreshToken }).pipe(
        catchError(() => of(null))
      ).subscribe();
    }

    // Clear local state
    this.clearStorage();
    this._user.set(null);
    this.stopRefreshTokenTimer();

    // Navigate to login
    if (navigate) {
      this.router.navigate(['/login']);
    }
  }

  /**
   * Refresh access token
   */
  refreshToken(): Observable<AuthTokens> {
    const refreshToken = this.getRefreshToken();

    if (!refreshToken) {
      return throwError(() => new Error('No refresh token'));
    }

    if (this.isRefreshing) {
      return this.refreshTokenSubject.pipe(
        map(token => {
          if (!token) throw new Error('Refresh failed');
          return { accessToken: token } as AuthTokens;
        })
      );
    }

    this.isRefreshing = true;
    this.refreshTokenSubject.next(null);

    return this.http.post<{ tokens: AuthTokens }>(`${this.API_URL}/refresh`, { refreshToken }).pipe(
      tap(response => {
        this.storeTokens(response.tokens);
        this.isRefreshing = false;
        this.refreshTokenSubject.next(response.tokens.accessToken);
      }),
      map(response => response.tokens),
      catchError(error => {
        this.isRefreshing = false;
        this.logout(true);
        return throwError(() => error);
      })
    );
  }

  /**
   * Request password reset
   */
  forgotPassword(email: string): Observable<{ message: string }> {
    this._isLoading.set(true);

    return this.http.post<{ message: string }>(`${this.API_URL}/forgot-password`, { email }).pipe(
      catchError(error => this.handleAuthError(error)),
      finalize(() => this._isLoading.set(false))
    );
  }

  /**
   * Reset password with token
   */
  resetPassword(token: string, newPassword: string): Observable<{ message: string }> {
    this._isLoading.set(true);

    return this.http.post<{ message: string }>(`${this.API_URL}/reset-password`, {
      token,
      newPassword
    }).pipe(
      catchError(error => this.handleAuthError(error)),
      finalize(() => this._isLoading.set(false))
    );
  }

  /**
   * Change password (authenticated)
   */
  changePassword(data: ChangePasswordRequest): Observable<{ message: string }> {
    this._isLoading.set(true);

    return this.http.post<{ message: string }>(`${this.API_URL}/change-password`, data).pipe(
      catchError(error => this.handleAuthError(error)),
      finalize(() => this._isLoading.set(false))
    );
  }

  /**
   * Verify email with token
   */
  verifyEmail(token: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.API_URL}/verify-email`, { token }).pipe(
      catchError(error => this.handleAuthError(error))
    );
  }

  /**
   * Resend verification email
   */
  resendVerification(): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.API_URL}/resend-verification`, {}).pipe(
      catchError(error => this.handleAuthError(error))
    );
  }

  // ============================================
  // PROFILE METHODS
  // ============================================

  /**
   * Get current user profile
   */
  getProfile(): Observable<User> {
    return this.http.get<User>(`${environment.apiUrl}/users/me`).pipe(
      tap(user => {
        this._user.set(user);
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      }),
      catchError(error => this.handleAuthError(error))
    );
  }

  /**
   * Update user profile
   */
  updateProfile(data: UpdateProfileRequest): Observable<User> {
    this._isLoading.set(true);

    return this.http.put<User>(`${environment.apiUrl}/users/me`, data).pipe(
      tap(user => {
        this._user.set(user);
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      }),
      catchError(error => this.handleAuthError(error)),
      finalize(() => this._isLoading.set(false))
    );
  }

  /**
   * Upload avatar
   */
  uploadAvatar(file: File): Observable<{ avatarUrl: string }> {
    this._isLoading.set(true);

    const formData = new FormData();
    formData.append('avatar', file);

    return this.http.post<{ avatarUrl: string }>(`${environment.apiUrl}/users/me/avatar`, formData).pipe(
      tap(response => {
        this._user.update(user => user ? { ...user, avatarUrl: response.avatarUrl } : null);
        const storedUser = localStorage.getItem(STORAGE_KEYS.USER);
        if (storedUser) {
          const user = JSON.parse(storedUser);
          user.avatarUrl = response.avatarUrl;
          localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
        }
      }),
      catchError(error => this.handleAuthError(error)),
      finalize(() => this._isLoading.set(false))
    );
  }

  /**
   * Delete account
   */
  deleteAccount(password: string): Observable<void> {
    this._isLoading.set(true);

    return this.http.delete<void>(`${environment.apiUrl}/users/me`, {
      body: { password }
    }).pipe(
      tap(() => this.logout(true)),
      catchError(error => this.handleAuthError(error)),
      finalize(() => this._isLoading.set(false))
    );
  }

  // ============================================
  // TOKEN METHODS
  // ============================================

  /**
   * Get access token
   */
  getAccessToken(): string | null {
    return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  }

  /**
   * Get refresh token
   */
  getRefreshToken(): string | null {
    return localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  }

  /**
   * Check if user has valid token
   */
  hasValidToken(): boolean {
    const token = this.getAccessToken();
    const expiry = localStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRY);

    if (!token || !expiry) return false;

    return Date.now() < parseInt(expiry, 10);
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  private handleAuthSuccess(response: AuthResponse): void {
    this._user.set(response.user);
    this.storeTokens(response.tokens);
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(response.user));

    // Handle redirect
    const redirectUrl = sessionStorage.getItem('redirectUrl');
    if (redirectUrl) {
      sessionStorage.removeItem('redirectUrl');
      this.router.navigateByUrl(redirectUrl);
    } else {
      this.router.navigate(['/home']);
    }
  }

  private handleAuthError(error: HttpErrorResponse): Observable<never> {
    let message = 'Ein Fehler ist aufgetreten';

    if (error.error?.message) {
      message = error.error.message;
    } else if (error.error?.error) {
      message = error.error.error;
    } else if (error.status === 401) {
      message = 'Ungültige Anmeldedaten';
    } else if (error.status === 409) {
      message = 'E-Mail oder Benutzername bereits vergeben';
    } else if (error.status === 404) {
      message = 'Benutzer nicht gefunden';
    } else if (error.status === 0) {
      message = 'Keine Verbindung zum Server';
    }

    return throwError(() => new Error(message));
  }

  private storeTokens(tokens: AuthTokens): void {
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken);
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken);

    // Calculate expiry time
    const expiryTime = Date.now() + tokens.expiresIn * 1000;
    localStorage.setItem(STORAGE_KEYS.TOKEN_EXPIRY, expiryTime.toString());

    // Start refresh timer
    this.startRefreshTokenTimer(tokens.expiresIn * 1000);
  }

  private clearStorage(): void {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
    localStorage.removeItem(STORAGE_KEYS.TOKEN_EXPIRY);
  }

  private startRefreshTokenTimer(expiresIn: number): void {
    this.stopRefreshTokenTimer();

    // Refresh 1 minute before expiry
    const refreshTime = expiresIn - 60000;

    if (refreshTime > 0) {
      this.refreshTokenTimeout = setTimeout(() => {
        this.refreshToken().subscribe({
          error: () => this.logout(true)
        });
      }, refreshTime);
    }
  }

  private stopRefreshTokenTimer(): void {
    if (this.refreshTokenTimeout) {
      clearTimeout(this.refreshTokenTimeout);
      this.refreshTokenTimeout = undefined;
    }
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Update local user data (without API call)
   */
  updateLocalUser(data: Partial<User>): void {
    this._user.update(user => user ? { ...user, ...data } : null);
    const storedUser = localStorage.getItem(STORAGE_KEYS.USER);
    if (storedUser) {
      const user = JSON.parse(storedUser);
      Object.assign(user, data);
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    }
  }

  /**
   * Check if email is available
   */
  checkEmailAvailability(email: string): Observable<{ available: boolean }> {
    return this.http.post<{ available: boolean }>(`${this.API_URL}/check-email`, { email });
  }

  /**
   * Check if username is available
   */
  checkUsernameAvailability(username: string): Observable<{ available: boolean }> {
    return this.http.post<{ available: boolean }>(`${this.API_URL}/check-username`, { username });
  }
}