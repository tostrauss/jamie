// src/app/pages/auth/landing/landing.component.ts
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-[#1c1c2e] flex flex-col relative overflow-hidden">
      
      <!-- Animated Background -->
      <div class="absolute inset-0 pointer-events-none">
        <div class="absolute top-[-40%] left-[-30%] w-[800px] h-[800px] bg-purple-600/20 rounded-full blur-[180px] animate-pulse-slow"></div>
        <div class="absolute bottom-[-40%] right-[-30%] w-[800px] h-[800px] bg-[#FD7666]/15 rounded-full blur-[180px] animate-pulse-slow animation-delay-2000"></div>
        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#FD7666]/10 rounded-full blur-[150px]"></div>
      </div>

      <!-- Content -->
      <div class="flex-1 flex flex-col items-center justify-center px-8 relative z-10">
        
        <!-- Logo -->
        <div class="mb-4 animate-float">
          <div class="w-24 h-24 bg-gradient-to-br from-[#FD7666] to-[#ff8a65] rounded-3xl flex items-center justify-center shadow-2xl shadow-[#FD7666]/30 transform rotate-3">
            <span class="text-5xl font-black text-white tracking-tight" style="font-family: 'Archivo Black', sans-serif;">J</span>
          </div>
        </div>

        <!-- Brand Name -->
        <h1 class="text-6xl font-black text-[#FD7666] tracking-tight mb-6 animate-slide-up" 
            style="font-family: 'Archivo Black', sans-serif; text-shadow: 0 4px 30px rgba(253, 118, 102, 0.3);">
          JAMIE
        </h1>

        <!-- Tagline -->
        <p class="text-gray-400 text-center text-lg mb-16 max-w-xs animate-fade-in animation-delay-300">
          Neue Leute kennenlernen.<br>Gemeinsam was erleben.
        </p>

      </div>

      <!-- Bottom Actions -->
      <div class="px-8 pb-12 space-y-4 relative z-10">
        
        <!-- Subtext -->
        <p class="text-gray-500 text-sm text-center mb-6 animate-fade-in animation-delay-500">
          Login is annoying but we will try to make it as short as possible
        </p>

        <!-- Email Button (Primary) -->
        <button 
          (click)="navigateTo('login')"
          class="w-full py-4 bg-[#FD7666] hover:bg-[#ff5744] text-white font-bold rounded-2xl 
                 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]
                 shadow-lg shadow-[#FD7666]/30 animate-slide-up animation-delay-600">
          <div class="flex items-center justify-center gap-3">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
            </svg>
            <span>Email</span>
          </div>
        </button>

        <!-- Apple Button -->
        <button 
          (click)="socialLogin('apple')"
          class="w-full py-4 bg-[#2e2e42] hover:bg-[#3e3e52] text-white font-bold rounded-2xl 
                 border border-white/10 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]
                 animate-slide-up animation-delay-700">
          <div class="flex items-center justify-center gap-3">
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
            </svg>
            <span>Apple</span>
          </div>
        </button>

        <!-- Google Button -->
        <button 
          (click)="socialLogin('google')"
          class="w-full py-4 bg-[#2e2e42] hover:bg-[#3e3e52] text-white font-bold rounded-2xl 
                 border border-white/10 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]
                 animate-slide-up animation-delay-800">
          <div class="flex items-center justify-center gap-3">
            <svg class="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span class="text-white">Google</span>
          </div>
        </button>

        <!-- Terms -->
        <p class="text-gray-600 text-xs text-center mt-6 animate-fade-in animation-delay-1000">
          Mit der Anmeldung akzeptierst du unsere<br>
          <a href="#" class="text-[#FD7666] hover:underline">AGB</a> und 
          <a href="#" class="text-[#FD7666] hover:underline">Datenschutzrichtlinien</a>
        </p>

      </div>

    </div>
  `,
  styles: [`
    @keyframes float {
      0%, 100% { transform: translateY(0) rotate(3deg); }
      50% { transform: translateY(-10px) rotate(3deg); }
    }
    .animate-float { animation: float 4s ease-in-out infinite; }

    @keyframes slideUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-slide-up { animation: slideUp 0.6s ease-out forwards; }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    .animate-fade-in { animation: fadeIn 0.8s ease-out forwards; }

    @keyframes pulseSlow {
      0%, 100% { opacity: 0.5; transform: scale(1); }
      50% { opacity: 0.3; transform: scale(1.1); }
    }
    .animate-pulse-slow { animation: pulseSlow 8s ease-in-out infinite; }

    .animation-delay-300 { animation-delay: 300ms; }
    .animation-delay-500 { animation-delay: 500ms; }
    .animation-delay-600 { animation-delay: 600ms; }
    .animation-delay-700 { animation-delay: 700ms; }
    .animation-delay-800 { animation-delay: 800ms; }
    .animation-delay-1000 { animation-delay: 1000ms; }
    .animation-delay-2000 { animation-delay: 2000ms; }
  `]
})
export class LandingComponent {
  private readonly router = inject(Router);

  navigateTo(route: string): void {
    this.router.navigate([`/${route}`]);
  }

  socialLogin(provider: 'apple' | 'google'): void {
    // TODO: Implement OAuth flow
    console.log(`Social login with ${provider}`);
    // For now, redirect to email login
    this.router.navigate(['/login']);
  }
}
