import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap, catchError, of } from 'rxjs';
import { UserProfile } from '../models/types';

interface AuthResponse {
  token: string;
  user: UserProfile;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private apiUrl = 'http://localhost:3000/api/auth';
  private tokenKey = 'jamie_auth_token';

  // --- STATE ---
  // Signal für den aktuellen User (null = nicht eingeloggt)
  currentUser = signal<UserProfile | null>(null);
  
  // Computed Signal: Ist User eingeloggt?
  isLoggedIn = () => this.currentUser() !== null;

  constructor() {
    // Beim Start: Versuchen, User aus Token wiederherzustellen
    this.tryAutoLogin();
  }

  // --- ACTIONS ---

  register(credentials: { email: string, username: string, password: string }) {
    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, credentials).pipe(
      tap(response => this.handleAuthSuccess(response))
    );
  }

  login(credentials: { email: string, password: string }) {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, credentials).pipe(
      tap(response => this.handleAuthSuccess(response))
    );
  }

  logout() {
    localStorage.removeItem(this.tokenKey);
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  // --- INTERNALS ---

  private handleAuthSuccess(response: AuthResponse) {
    // 1. Token speichern
    localStorage.setItem(this.tokenKey, response.token);
    // 2. State updaten
    this.currentUser.set(response.user);
    // 3. Weiterleiten
    this.router.navigate(['/']);
  }

  private tryAutoLogin() {
    const token = this.getToken();
    if (!token) return;

    // Wir laden das Profil vom Backend, um sicherzugehen, dass der Token noch gültig ist
    this.http.get<UserProfile>('http://localhost:3000/api/users/me').subscribe({
      next: (user) => this.currentUser.set(user),
      error: () => this.logout() // Token ungültig -> Logout
    });
  }
}