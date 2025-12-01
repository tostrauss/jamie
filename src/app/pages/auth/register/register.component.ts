// src/app/pages/auth/register/register.component.ts
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';
import { CITIES } from '../../../models/types';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-[#1c1c2e] flex flex-col relative overflow-hidden">
      
      <!-- Background -->
      <div class="absolute inset-0 pointer-events-none">
        <div class="absolute top-[-30%] left-[-30%] w-[600px] h-[600px] bg-purple-600/20 rounded-full blur-[150px]"></div>
        <div class="absolute bottom-[-30%] right-[-30%] w-[600px] h-[600px] bg-[#FD7666]/15 rounded-full blur-[150px]"></div>
      </div>

      <!-- Header -->
      <header class="px-6 pt-14 pb-6 relative z-10">
        <button 
          (click)="goBack()"
          class="w-10 h-10 bg-[#2e2e42] rounded-xl flex items-center justify-center hover:bg-[#3e3e52] transition-colors">
          <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
      </header>

      <!-- Content -->
      <div class="flex-1 px-6 relative z-10">
        
        <!-- Progress Indicator -->
        <div class="flex gap-2 mb-8">
          @for (step of [1, 2, 3]; track step) {
            <div class="flex-1 h-1 rounded-full transition-colors duration-300"
                 [class]="currentStep() >= step ? 'bg-[#FD7666]' : 'bg-[#2e2e42]'">
            </div>
          }
        </div>

        <!-- Step 1: Email & Username -->
        @if (currentStep() === 1) {
          <div class="animate-slide-in">
            <h1 class="text-3xl font-bold text-white mb-2">Erstelle deinen Account</h1>
            <p class="text-gray-400 mb-8">Erzähl uns ein bisschen von dir</p>

            <div class="space-y-5">
              <!-- Username -->
              <div class="space-y-2">
                <label class="text-xs text-gray-400 uppercase font-bold tracking-wider">Username</label>
                <div class="relative">
                  <svg class="w-5 h-5 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                  </svg>
                  <input 
                    type="text" 
                    [(ngModel)]="formData.username" 
                    placeholder="Dein einzigartiger Name"
                    minlength="3"
                    maxlength="20"
                    class="input-jamie pl-12">
                </div>
                @if (formData.username && formData.username.length < 3) {
                  <p class="text-xs text-[#FD7666]">Mindestens 3 Zeichen</p>
                }
              </div>

              <!-- Email -->
              <div class="space-y-2">
                <label class="text-xs text-gray-400 uppercase font-bold tracking-wider">Email</label>
                <div class="relative">
                  <svg class="w-5 h-5 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                  </svg>
                  <input 
                    type="email" 
                    [(ngModel)]="formData.email" 
                    placeholder="deine@email.com"
                    class="input-jamie pl-12">
                </div>
              </div>
            </div>
          </div>
        }

        <!-- Step 2: Password -->
        @if (currentStep() === 2) {
          <div class="animate-slide-in">
            <h1 class="text-3xl font-bold text-white mb-2">Sichere dein Konto</h1>
            <p class="text-gray-400 mb-8">Wähle ein starkes Passwort</p>

            <div class="space-y-5">
              <!-- Password -->
              <div class="space-y-2">
                <label class="text-xs text-gray-400 uppercase font-bold tracking-wider">Passwort</label>
                <div class="relative">
                  <svg class="w-5 h-5 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                  </svg>
                  <input 
                    [type]="showPassword() ? 'text' : 'password'" 
                    [(ngModel)]="formData.password" 
                    placeholder="Mindestens 6 Zeichen"
                    minlength="6"
                    class="input-jamie pl-12 pr-12">
                  <button 
                    type="button"
                    (click)="showPassword.update(v => !v)"
                    class="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
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
                <div class="flex gap-1 mt-3">
                  @for (i of [0, 1, 2, 3]; track i) {
                    <div class="flex-1 h-1 rounded-full transition-colors duration-300"
                         [class]="passwordStrength() > i ? strengthColors[passwordStrength() - 1] : 'bg-[#2e2e42]'">
                    </div>
                  }
                </div>
                <p class="text-xs" [class]="passwordStrength() >= 3 ? 'text-green-400' : 'text-gray-500'">
                  {{ passwordStrengthText() }}
                </p>
              </div>

              <!-- Confirm Password -->
              <div class="space-y-2">
                <label class="text-xs text-gray-400 uppercase font-bold tracking-wider">Passwort bestätigen</label>
                <div class="relative">
                  <svg class="w-5 h-5 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  <input 
                    [type]="showPassword() ? 'text' : 'password'" 
                    [(ngModel)]="formData.confirmPassword" 
                    placeholder="Passwort wiederholen"
                    class="input-jamie pl-12">
                </div>
                @if (formData.confirmPassword && formData.password !== formData.confirmPassword) {
                  <p class="text-xs text-[#FD7666]">Passwörter stimmen nicht überein</p>
                }
              </div>
            </div>
          </div>
        }

        <!-- Step 3: City Selection -->
        @if (currentStep() === 3) {
          <div class="animate-slide-in">
            <h1 class="text-3xl font-bold text-white mb-2">Wo bist du?</h1>
            <p class="text-gray-400 mb-8">Wähle deine Stadt für lokale Aktivitäten</p>

            <div class="grid grid-cols-2 gap-3">
              @for (city of cities; track city) {
                <button 
                  (click)="formData.city = city"
                  class="p-4 rounded-2xl border-2 transition-all duration-300 text-left"
                  [class]="formData.city === city 
                    ? 'bg-[#FD7666]/20 border-[#FD7666] text-white' 
                    : 'bg-[#2e2e42] border-transparent text-gray-300 hover:border-white/20'">
                  <span class="font-medium">{{ city }}</span>
                </button>
              }
            </div>

            <p class="text-sm text-gray-500 mt-4 text-center">
              Du kannst dies später ändern
            </p>
          </div>
        }

        <!-- Error Message -->
        @if (errorMessage()) {
          <div class="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl animate-shake">
            <p class="text-red-400 text-sm text-center">{{ errorMessage() }}</p>
          </div>
        }

      </div>

      <!-- Bottom Actions -->
      <div class="px-6 pb-8 pt-4 relative z-10">
        <button 
          (click)="nextStep()"
          [disabled]="!canProceed() || isLoading()"
          class="w-full py-4 bg-[#FD7666] hover:bg-[#ff5744] text-white font-bold rounded-2xl 
                 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed
                 disabled:hover:bg-[#FD7666]">
          @if (isLoading()) {
            <span class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block"></span>
          } @else {
            {{ currentStep() === 3 ? 'Account erstellen' : 'Weiter' }}
          }
        </button>

        @if (currentStep() === 1) {
          <p class="text-center text-gray-500 text-sm mt-4">
            Schon ein Konto? 
            <a routerLink="/login" class="text-[#FD7666] font-medium hover:underline">Anmelden</a>
          </p>
        }
      </div>

    </div>
  `,
  styles: [`
    @keyframes slideIn {
      from { opacity: 0; transform: translateX(20px); }
      to { opacity: 1; transform: translateX(0); }
    }
    .animate-slide-in { animation: slideIn 0.4s ease-out forwards; }

    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-5px); }
      75% { transform: translateX(5px); }
    }
    .animate-shake { animation: shake 0.3s ease-in-out; }

    .input-jamie {
      @apply w-full bg-[#2e2e42] text-white rounded-xl px-4 py-3.5 border border-white/10 
             focus:border-[#FD7666] focus:outline-none transition-colors placeholder-gray-600;
    }
  `]
})
export class RegisterComponent {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly toast = inject(ToastService);

  currentStep = signal(1);
  isLoading = signal(false);
  showPassword = signal(false);
  errorMessage = signal<string | null>(null);

  cities = CITIES;
  strengthColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500'];

  formData = {
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    city: ''
  };

  passwordStrength = signal(0);

  passwordStrengthText(): string {
    const texts = ['Sehr schwach', 'Schwach', 'Mittel', 'Stark'];
    return texts[this.passwordStrength() - 1] || 'Gib ein Passwort ein';
  }

  canProceed(): boolean {
    switch (this.currentStep()) {
      case 1:
        return this.formData.username.length >= 3 && 
               this.formData.email.includes('@') &&
               this.formData.email.includes('.');
      case 2:
        return this.formData.password.length >= 6 && 
               this.formData.password === this.formData.confirmPassword;
      case 3:
        return this.formData.city.length > 0;
      default:
        return false;
    }
  }

  ngDoCheck(): void {
    // Calculate password strength
    const pwd = this.formData.password;
    let strength = 0;
    if (pwd.length >= 6) strength++;
    if (pwd.length >= 8) strength++;
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) strength++;
    if (/[0-9]/.test(pwd) || /[^A-Za-z0-9]/.test(pwd)) strength++;
    this.passwordStrength.set(strength);
  }

  goBack(): void {
    if (this.currentStep() > 1) {
      this.currentStep.update(s => s - 1);
      this.errorMessage.set(null);
    } else {
      this.router.navigate(['/']);
    }
  }

  nextStep(): void {
    if (!this.canProceed()) return;

    this.errorMessage.set(null);

    if (this.currentStep() < 3) {
      this.currentStep.update(s => s + 1);
    } else {
      this.submit();
    }
  }

  private submit(): void {
    this.isLoading.set(true);

    this.authService.register({
      email: this.formData.email,
      username: this.formData.username,
      password: this.formData.password,
      city: this.formData.city
    }).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.toast.success('Account erstellt! Willkommen bei Jamie 🎉');
        this.router.navigate(['/onboarding']);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.message || 'Registrierung fehlgeschlagen');
      }
    });
  }
}