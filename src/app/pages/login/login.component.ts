// src/app/pages/login/login.component.ts
// Jamie App - Login/Register Page Component

import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { CITIES } from '../../models/types';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-[#1c1c2e] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      
      <div class="absolute top-[-30%] left-[-30%] w-[600px] h-[600px] bg-purple-600/20 rounded-full blur-[150px] pointer-events-none"></div>
      <div class="absolute bottom-[-30%] right-[-30%] w-[600px] h-[600px] bg-orange-500/15 rounded-full blur-[150px] pointer-events-none"></div>

      <div class="w-full max-w-md bg-[#2e2e42] rounded-[28px] p-8 shadow-2xl border border-white/5 relative z-10 animate-zoom-in">
        
        <div class="text-center mb-8">
          <div class="w-16 h-16 bg-gradient-to-tr from-[#ff8a65] to-[#ff7043] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-500/30">
            <span class="text-3xl font-bold text-white">J</span>
          </div>
          <h1 class="text-2xl font-bold text-white mb-1">
            {{ isLoginMode() ? 'Willkommen zurück!' : 'Werde Teil von Jamie' }}
          </h1>
          <p class="text-gray-400 text-sm">
            {{ isLoginMode() ? 'Melde dich an um weiterzumachen' : 'Erstelle deinen Account' }}
          </p>
        </div>

        <form (submit)="submit($event)" class="space-y-4">
          
          @if (!isLoginMode()) {
            <div class="space-y-1.5 animate-slide-down">
              <label class="text-xs text-gray-400 uppercase font-bold tracking-wider ml-1">Username</label>
              <div class="relative">
                <svg width="20" height="20" class="w-5 h-5 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                </svg>
                <input 
                  type="text" 
                  [(ngModel)]="formData.username" 
                  name="username" 
                  placeholder="Dein Username"
                  minlength="3"
                  maxlength="20"
                  autocomplete="username"
                  class="w-full bg-[#1c1c2e] text-white rounded-xl pl-12 pr-4 py-3.5 border border-white/10 focus:border-[#ff7043] focus:outline-none transition-colors placeholder-gray-600">
              </div>
              @if (formData.username && formData.username.length < 3) {
                <p class="text-xs text-[#ff7043] ml-1">Min. 3 Zeichen</p>
              }
            </div>
          }

          <div class="space-y-1.5">
            <label class="text-xs text-gray-400 uppercase font-bold tracking-wider ml-1">Email</label>
            <div class="relative">
              <svg width="20" height="20" class="w-5 h-5 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
              </svg>
              <input 
                type="email" 
                [(ngModel)]="formData.email" 
                name="email" 
                placeholder="deine@email.com" 
                required
                autocomplete="email"
                class="w-full bg-[#1c1c2e] text-white rounded-xl pl-12 pr-4 py-3.5 border border-white/10 focus:border-[#ff7043] focus:outline-none transition-colors placeholder-gray-600">
            </div>
          </div>

          <div class="space-y-1.5">
            <label class="text-xs text-gray-400 uppercase font-bold tracking-wider ml-1">Passwort</label>
            <div class="relative">
              <svg width="20" height="20" class="w-5 h-5 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
              </svg>
              <input 
                [type]="showPassword() ? 'text' : 'password'" 
                [(ngModel)]="formData.password" 
                name="password" 
                placeholder="••••••••" 
                required
                minlength="6"
                [autocomplete]="isLoginMode() ? 'current-password' : 'new-password'"
                class="w-full bg-[#1c1c2e] text-white rounded-xl pl-12 pr-12 py-3.5 border border-white/10 focus:border-[#ff7043] focus:outline-none transition-colors placeholder-gray-600">
              <button 
                type="button"
                (click)="showPassword.set(!showPassword())"
                class="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors cursor-pointer">
                @if (showPassword()) {
                  <svg width="20" height="20" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
                  </svg>
                } @else {
                  <svg width="20" height="20" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                  </svg>
                }
              </button>
            </div>
            @if (!isLoginMode() && formData.password && formData.password.length < 6) {
              <p class="text-xs text-[#ff7043] ml-1">Min. 6 Zeichen</p>
            }
          </div>

          @if (!isLoginMode()) {
            <div class="space-y-1.5 animate-slide-down">
              <label class="text-xs text-gray-400 uppercase font-bold tracking-wider ml-1">Stadt (optional)</label>
              <div class="relative">
                <svg width="20" height="20" class="w-5 h-5 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                </svg>
                <select 
                  [(ngModel)]="formData.city" 
                  name="city"
                  class="w-full bg-[#1c1c2e] text-white rounded-xl pl-12 pr-4 py-3.5 border border-white/10 focus:border-[#ff7043] focus:outline-none transition-colors appearance-none cursor-pointer">
                  <option value="">Stadt wählen...</option>
                  @for (city of cities; track city) {
                    <option [value]="city">{{ city }}</option>
                  }
                </select>
                <svg width="20" height="20" class="w-5 h-5 text-gray-500 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                </svg>
              </div>
            </div>
          }

          @if (errorMessage()) {
            <div class="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center animate-scale-in">
              {{ errorMessage() }}
            </div>
          }

          <button 
            type="submit" 
            [disabled]="!isFormValid() || isLoading()"
            class="w-full btn-jamie btn-primary py-4 mt-2 font-bold shadow-lg shadow-orange-500/20 active:scale-95 transition-transform">
            @if (isLoading()) {
              <span class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block"></span>
            } @else {
              {{ isLoginMode() ? 'Einloggen' : 'Account erstellen' }}
            }
          </button>
        </form>

        <div class="mt-6 text-center">
          <button 
            (click)="toggleMode()" 
            class="text-sm text-gray-400 hover:text-white transition-colors">
            {{ isLoginMode() ? 'Noch keinen Account? ' : 'Bereits dabei? ' }}
            <span class="text-[#ff7043] font-semibold hover:underline">
              {{ isLoginMode() ? 'Registrieren' : 'Einloggen' }}
            </span>
          </button>
        </div>

        <div class="flex items-center gap-4 my-6">
          <div class="flex-1 h-px bg-white/10"></div>
          <span class="text-xs text-gray-500">oder</span>
          <div class="flex-1 h-px bg-white/10"></div>
        </div>

        <div class="space-y-3">
          <button 
            type="button"
            disabled
            class="w-full bg-white/5 hover:bg-white/10 text-gray-300 font-medium py-3.5 rounded-xl transition-colors flex items-center justify-center gap-3 border border-white/5 opacity-50 cursor-not-allowed">
            <svg width="20" height="20" class="w-5 h-5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Mit Google fortfahren
          </button>
        </div>
      </div>

      <p class="text-xs text-gray-500 mt-8 text-center">
        Mit der Nutzung stimmst du unseren 
        <a href="#" class="text-[#ff7043] hover:underline">Nutzungsbedingungen</a> 
        und der 
        <a href="#" class="text-[#ff7043] hover:underline">Datenschutzerklärung</a> zu.
      </p>
    </div>
  `,
  styles: [`
    @keyframes slideDown {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-slide-down { animation: slideDown 0.3s ease-out forwards; }

    @keyframes zoomIn {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }
    .animate-zoom-in { animation: zoomIn 0.4s ease-out forwards; }

    @keyframes scaleIn {
      from { opacity: 0; transform: scale(0.9); }
      to { opacity: 1; transform: scale(1); }
    }
    .animate-scale-in { animation: scaleIn 0.2s ease-out forwards; }
  `]
})
export class LoginComponent {
  private readonly authService = inject(AuthService);
  private readonly toast = inject(ToastService);

  isLoginMode = signal(true);
  isLoading = signal(false);
  showPassword = signal(false);
  errorMessage = signal<string | null>(null);

  cities = CITIES;

  formData = {
    username: '',
    email: '',
    password: '',
    city: ''
  };

  isFormValid(): boolean {
    if (this.isLoginMode()) {
      return this.formData.email.length > 0 && this.formData.password.length >= 6;
    }
    return (
      this.formData.username.length >= 3 &&
      this.formData.email.length > 0 &&
      this.formData.password.length >= 6
    );
  }

  toggleMode(): void {
    this.isLoginMode.update(v => !v);
    this.errorMessage.set(null);
    this.showPassword.set(false);
  }

  submit(event: Event): void {
    event.preventDefault();
    if (!this.isFormValid() || this.isLoading()) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const action$ = this.isLoginMode()
      ? this.authService.login({ 
          email: this.formData.email, 
          password: this.formData.password 
        })
      : this.authService.register({
          email: this.formData.email,
          username: this.formData.username,
          password: this.formData.password,
          city: this.formData.city || undefined
        });

    action$.subscribe({
      next: () => {
        this.isLoading.set(false);
        this.toast.success(
          this.isLoginMode() ? 'Willkommen zurück!' : 'Account erfolgreich erstellt!'
        );
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.message || 'Ein Fehler ist aufgetreten');
      }
    });
  }
}