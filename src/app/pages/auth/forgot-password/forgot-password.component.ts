// src/app/pages/auth/forgot-password/forgot-password.component.ts
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

type ForgotPasswordStep = 'email' | 'sent' | 'reset' | 'success';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="min-h-screen bg-[#1c1c2e] flex flex-col relative overflow-hidden">
      
      <!-- Animated Background -->
      <div class="absolute inset-0 pointer-events-none">
        <div class="absolute top-[-30%] left-[-30%] w-[600px] h-[600px] bg-purple-600/20 rounded-full blur-[150px] animate-pulse-slow"></div>
        <div class="absolute bottom-[-30%] right-[-30%] w-[600px] h-[600px] bg-[#FD7666]/15 rounded-full blur-[150px] animate-pulse-slow"></div>
      </div>

      <!-- Header -->
      <header class="px-6 pt-14 pb-6 relative z-10">
        <button 
          (click)="goBack()"
          class="w-10 h-10 bg-[#2e2e42] rounded-xl flex items-center justify-center hover:bg-[#3e3e52] transition-colors mb-6">
          <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
      </header>

      <!-- Content -->
      <div class="flex-1 px-6 relative z-10">
        
        <!-- Step 1: Email Input -->
        @if (currentStep() === 'email') {
          <div class="animate-fade-in">
            <!-- Icon -->
            <div class="w-20 h-20 bg-[#FD7666]/20 rounded-3xl flex items-center justify-center mb-6">
              <svg class="w-10 h-10 text-[#FD7666]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/>
              </svg>
            </div>

            <h1 class="text-3xl font-bold text-white mb-2">Passwort vergessen?</h1>
            <p class="text-gray-400 mb-8">Kein Problem! Gib deine E-Mail ein und wir senden dir einen Link zum Zurücksetzen.</p>

            <!-- Email Input -->
            <div class="space-y-2 mb-6">
              <label class="text-xs text-gray-400 uppercase font-bold tracking-wider">E-Mail Adresse</label>
              <div class="relative">
                <svg class="w-5 h-5 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                </svg>
                <input 
                  type="email" 
                  [(ngModel)]="email"
                  (keydown.enter)="sendResetLink()"
                  placeholder="deine@email.com"
                  class="w-full bg-[#2e2e42] text-white rounded-xl pl-12 pr-4 py-4 border border-white/10 focus:border-[#FD7666] focus:outline-none transition-colors placeholder-gray-600"
                  [class.border-red-500]="emailError">
              </div>
              @if (emailError) {
                <p class="text-red-400 text-sm flex items-center gap-1">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  {{ emailError }}
                </p>
              }
            </div>

            <!-- Submit Button -->
            <button 
              (click)="sendResetLink()"
              [disabled]="isLoading() || !email"
              class="w-full py-4 bg-[#FD7666] hover:bg-[#ff5744] text-white font-bold rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              @if (isLoading()) {
                <div class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Wird gesendet...</span>
              } @else {
                <span>Link senden</span>
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
                </svg>
              }
            </button>

            <!-- Back to Login -->
            <p class="text-center text-gray-500 text-sm mt-6">
              Erinnerst du dich wieder?
              <a routerLink="/login" class="text-[#FD7666] font-medium hover:underline ml-1">Anmelden</a>
            </p>
          </div>
        }

        <!-- Step 2: Email Sent Confirmation -->
        @if (currentStep() === 'sent') {
          <div class="animate-fade-in text-center">
            <!-- Success Icon -->
            <div class="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg class="w-12 h-12 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
              </svg>
            </div>

            <h1 class="text-3xl font-bold text-white mb-2">Check deine Emails!</h1>
            <p class="text-gray-400 mb-2">Wir haben einen Link zum Zurücksetzen an</p>
            <p class="text-[#FD7666] font-medium mb-8">{{ email }}</p>

            <!-- Instructions -->
            <div class="bg-[#2e2e42] rounded-2xl p-5 text-left mb-8 border border-white/5">
              <h3 class="font-bold text-white mb-3">Nächste Schritte:</h3>
              <ul class="space-y-3 text-sm text-gray-400">
                <li class="flex items-start gap-3">
                  <span class="w-6 h-6 bg-[#FD7666]/20 rounded-full flex items-center justify-center text-[#FD7666] text-xs font-bold flex-shrink-0">1</span>
                  <span>Öffne deine E-Mails und suche nach einer Nachricht von Jamie</span>
                </li>
                <li class="flex items-start gap-3">
                  <span class="w-6 h-6 bg-[#FD7666]/20 rounded-full flex items-center justify-center text-[#FD7666] text-xs font-bold flex-shrink-0">2</span>
                  <span>Klicke auf den Link in der E-Mail</span>
                </li>
                <li class="flex items-start gap-3">
                  <span class="w-6 h-6 bg-[#FD7666]/20 rounded-full flex items-center justify-center text-[#FD7666] text-xs font-bold flex-shrink-0">3</span>
                  <span>Erstelle ein neues Passwort</span>
                </li>
              </ul>
            </div>

            <!-- Didn't receive email -->
            <div class="text-center">
              <p class="text-gray-500 text-sm mb-3">Keine E-Mail erhalten?</p>
              <button 
                (click)="resendEmail()"
                [disabled]="resendCooldown() > 0 || isLoading()"
                class="text-[#FD7666] font-medium hover:underline disabled:opacity-50 disabled:cursor-not-allowed">
                @if (resendCooldown() > 0) {
                  Erneut senden in {{ resendCooldown() }}s
                } @else {
                  Erneut senden
                }
              </button>
            </div>

            <!-- Open Email App (mobile) -->
            <a 
              href="mailto:"
              class="w-full mt-6 py-4 bg-[#2e2e42] hover:bg-[#3e3e52] text-white font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 border border-white/5">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
              </svg>
              E-Mail App öffnen
            </a>

            <!-- Back to Login -->
            <p class="text-center text-gray-500 text-sm mt-6">
              <a routerLink="/login" class="text-[#FD7666] font-medium hover:underline">Zurück zum Login</a>
            </p>
          </div>
        }

        <!-- Step 3: Reset Password (accessed via email link) -->
        @if (currentStep() === 'reset') {
          <div class="animate-fade-in">
            <!-- Icon -->
            <div class="w-20 h-20 bg-[#FD7666]/20 rounded-3xl flex items-center justify-center mb-6">
              <svg class="w-10 h-10 text-[#FD7666]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
              </svg>
            </div>

            <h1 class="text-3xl font-bold text-white mb-2">Neues Passwort</h1>
            <p class="text-gray-400 mb-8">Erstelle ein neues, sicheres Passwort für deinen Account.</p>

            <!-- New Password -->
            <div class="space-y-2 mb-4">
              <label class="text-xs text-gray-400 uppercase font-bold tracking-wider">Neues Passwort</label>
              <div class="relative">
                <svg class="w-5 h-5 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                </svg>
                <input 
                  [type]="showPassword() ? 'text' : 'password'"
                  [(ngModel)]="newPassword"
                  placeholder="Mindestens 8 Zeichen"
                  class="w-full bg-[#2e2e42] text-white rounded-xl pl-12 pr-12 py-4 border border-white/10 focus:border-[#FD7666] focus:outline-none transition-colors placeholder-gray-600">
                <button 
                  (click)="showPassword.set(!showPassword())"
                  class="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors">
                  @if (showPassword()) {
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
                    </svg>
                  } @else {
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                    </svg>
                  }
                </button>
              </div>
              <!-- Password Strength -->
              @if (newPassword) {
                <div class="flex gap-1 mt-2">
                  @for (i of [1,2,3,4]; track i) {
                    <div 
                      class="h-1 flex-1 rounded-full transition-colors"
                      [class]="i <= passwordStrength() ? strengthColors[passwordStrength() - 1] : 'bg-gray-700'">
                    </div>
                  }
                </div>
                <p class="text-xs" [class]="strengthTextColors[passwordStrength() - 1] || 'text-gray-500'">
                  {{ strengthTexts[passwordStrength() - 1] || 'Sehr schwach' }}
                </p>
              }
            </div>

            <!-- Confirm Password -->
            <div class="space-y-2 mb-6">
              <label class="text-xs text-gray-400 uppercase font-bold tracking-wider">Passwort bestätigen</label>
              <div class="relative">
                <svg class="w-5 h-5 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <input 
                  [type]="showPassword() ? 'text' : 'password'"
                  [(ngModel)]="confirmPassword"
                  placeholder="Passwort wiederholen"
                  class="w-full bg-[#2e2e42] text-white rounded-xl pl-12 pr-4 py-4 border border-white/10 focus:border-[#FD7666] focus:outline-none transition-colors placeholder-gray-600"
                  [class.border-red-500]="confirmPassword && newPassword !== confirmPassword"
                  [class.border-green-500]="confirmPassword && newPassword === confirmPassword">
              </div>
              @if (confirmPassword && newPassword !== confirmPassword) {
                <p class="text-red-400 text-sm">Passwörter stimmen nicht überein</p>
              }
            </div>

            <!-- Submit Button -->
            <button 
              (click)="resetPassword()"
              [disabled]="isLoading() || !canResetPassword()"
              class="w-full py-4 bg-[#FD7666] hover:bg-[#ff5744] text-white font-bold rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              @if (isLoading()) {
                <div class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Wird gespeichert...</span>
              } @else {
                <span>Passwort ändern</span>
              }
            </button>
          </div>
        }

        <!-- Step 4: Success -->
        @if (currentStep() === 'success') {
          <div class="animate-fade-in text-center">
            <!-- Success Icon with Animation -->
            <div class="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce-once">
              <svg class="w-12 h-12 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
            </div>

            <h1 class="text-3xl font-bold text-white mb-2">Passwort geändert!</h1>
            <p class="text-gray-400 mb-8">Dein Passwort wurde erfolgreich zurückgesetzt. Du kannst dich jetzt anmelden.</p>

            <!-- Login Button -->
            <button 
              (click)="goToLogin()"
              class="w-full py-4 bg-[#FD7666] hover:bg-[#ff5744] text-white font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-2">
              <span>Zum Login</span>
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
              </svg>
            </button>
          </div>
        }
      </div>

      <!-- Error Toast -->
      @if (generalError()) {
        <div class="fixed top-6 left-1/2 -translate-x-1/2 px-6 py-4 bg-red-500/90 backdrop-blur-xl rounded-2xl text-white text-sm font-medium shadow-lg animate-fade-in-down z-50">
          {{ generalError() }}
        </div>
      }
    </div>
  `,
  styles: [`
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes fadeInDown {
      from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
      to { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
    @keyframes bounceOnce {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.1); }
    }
    @keyframes pulseSlow {
      0%, 100% { opacity: 0.2; }
      50% { opacity: 0.3; }
    }
    .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
    .animate-fade-in-down { animation: fadeInDown 0.4s ease-out forwards; }
    .animate-bounce-once { animation: bounceOnce 0.5s ease-out; }
    .animate-pulse-slow { animation: pulseSlow 8s ease-in-out infinite; }
  `]
})
export class ForgotPasswordComponent {
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);

  // State
  currentStep = signal<ForgotPasswordStep>('email');
  isLoading = signal(false);
  showPassword = signal(false);
  resendCooldown = signal(0);
  generalError = signal('');

  // Form Data
  email = '';
  newPassword = '';
  confirmPassword = '';
  resetToken = '';

  // Errors
  emailError = '';

  // Password strength config
  strengthColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500'];
  strengthTextColors = ['text-red-400', 'text-orange-400', 'text-yellow-400', 'text-green-400'];
  strengthTexts = ['Sehr schwach', 'Schwach', 'Mittel', 'Stark'];

  constructor() {
    // Check for reset token in URL
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    if (token) {
      this.resetToken = token;
      this.currentStep.set('reset');
    }
  }

  passwordStrength(): number {
    const password = this.newPassword;
    if (!password) return 0;
    
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;
    
    return strength;
  }

  canResetPassword(): boolean {
    return (
      this.newPassword.length >= 8 &&
      this.newPassword === this.confirmPassword &&
      this.passwordStrength() >= 2
    );
  }

  sendResetLink(): void {
    // Validate email
    this.emailError = '';
    if (!this.email) {
      this.emailError = 'E-Mail ist erforderlich';
      return;
    }
    if (!this.isValidEmail(this.email)) {
      this.emailError = 'Ungültige E-Mail Adresse';
      return;
    }

    this.isLoading.set(true);

    this.http.post(`${environment.apiUrl}/auth/forgot-password`, { email: this.email })
      .subscribe({
        next: () => {
          this.isLoading.set(false);
          this.currentStep.set('sent');
          this.startResendCooldown();
        },
        error: (err) => {
          this.isLoading.set(false);
          // Always show success to prevent email enumeration
          this.currentStep.set('sent');
          this.startResendCooldown();
        }
      });
  }

  resendEmail(): void {
    if (this.resendCooldown() > 0) return;
    
    this.isLoading.set(true);
    
    this.http.post(`${environment.apiUrl}/auth/forgot-password`, { email: this.email })
      .subscribe({
        next: () => {
          this.isLoading.set(false);
          this.startResendCooldown();
          this.showTempError('E-Mail erneut gesendet!');
        },
        error: () => {
          this.isLoading.set(false);
          this.startResendCooldown();
        }
      });
  }

  resetPassword(): void {
    if (!this.canResetPassword()) return;

    this.isLoading.set(true);

    this.http.post(`${environment.apiUrl}/auth/reset-password`, {
      token: this.resetToken,
      password: this.newPassword
    }).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.currentStep.set('success');
      },
      error: (err) => {
        this.isLoading.set(false);
        this.showTempError(err.error?.error || 'Link ist abgelaufen oder ungültig');
      }
    });
  }

  private startResendCooldown(): void {
    this.resendCooldown.set(60);
    const interval = setInterval(() => {
      this.resendCooldown.update(v => {
        if (v <= 1) {
          clearInterval(interval);
          return 0;
        }
        return v - 1;
      });
    }, 1000);
  }

  private showTempError(message: string): void {
    this.generalError.set(message);
    setTimeout(() => this.generalError.set(''), 3000);
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  goBack(): void {
    if (this.currentStep() === 'sent') {
      this.currentStep.set('email');
    } else {
      this.router.navigate(['/login']);
    }
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }
}