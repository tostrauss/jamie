import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-[#1c1c2e] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div class="absolute top-[-20%] left-[-20%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div class="absolute bottom-[-20%] right-[-20%] w-[500px] h-[500px] bg-orange-500/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div class="w-full max-w-md bg-[#2e2e42] rounded-3xl p-8 shadow-2xl border border-white/5 relative z-10 animate-fade-in">
        
        <div class="text-center mb-8">
          <h1 class="text-3xl font-bold text-white mb-2">Jamie</h1>
          <p class="text-gray-400 text-sm">
            {{ isLoginMode() ? 'Willkommen zurück!' : 'Werde Teil der Community' }}
          </p>
        </div>

        <form (submit)="submit($event)" class="space-y-4">
          
          <div *ngIf="!isLoginMode()" class="space-y-1">
            <label class="text-xs text-gray-400 uppercase font-bold tracking-wider ml-1">Username</label>
            <input type="text" [(ngModel)]="formData.username" name="username" placeholder="Dein Name"
                   class="w-full bg-[#1c1c2e] text-white rounded-xl px-4 py-3.5 border border-white/10 focus:border-[#ff7043] focus:outline-none transition-colors">
          </div>

          <div class="space-y-1">
            <label class="text-xs text-gray-400 uppercase font-bold tracking-wider ml-1">Email</label>
            <input type="email" [(ngModel)]="formData.email" name="email" placeholder="hello@jamie.com" required
                   class="w-full bg-[#1c1c2e] text-white rounded-xl px-4 py-3.5 border border-white/10 focus:border-[#ff7043] focus:outline-none transition-colors">
          </div>

          <div class="space-y-1">
            <label class="text-xs text-gray-400 uppercase font-bold tracking-wider ml-1">Passwort</label>
            <input type="password" [(ngModel)]="formData.password" name="password" placeholder="••••••••" required
                   class="w-full bg-[#1c1c2e] text-white rounded-xl px-4 py-3.5 border border-white/10 focus:border-[#ff7043] focus:outline-none transition-colors">
          </div>

          <div *ngIf="errorMessage()" class="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
            {{ errorMessage() }}
          </div>

          <button type="submit" [disabled]="isLoading()"
                  class="w-full bg-gradient-to-r from-[#ff8a65] to-[#ff7043] text-white font-bold py-4 rounded-2xl shadow-lg shadow-orange-500/20 active:scale-95 transition-all mt-4 flex justify-center disabled:opacity-50 disabled:cursor-not-allowed">
            <span *ngIf="!isLoading()">{{ isLoginMode() ? 'Einloggen' : 'Account erstellen' }}</span>
            <span *ngIf="isLoading()" class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
          </button>
        </form>

        <div class="mt-6 text-center">
          <button (click)="toggleMode()" class="text-sm text-gray-400 hover:text-white transition-colors">
            {{ isLoginMode() ? 'Noch keinen Account? Registrieren' : 'Bereits dabei? Einloggen' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
  `]
})
export class LoginComponent {
  authService = inject(AuthService);
  router = inject(Router);

  isLoginMode = signal(true);
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);

  formData = {
    username: '',
    email: '',
    password: ''
  };

  toggleMode() {
    this.isLoginMode.update(v => !v);
    this.errorMessage.set(null);
  }

  submit(event: Event) {
    event.preventDefault();
    this.isLoading.set(true);
    this.errorMessage.set(null);

    const action$ = this.isLoginMode() 
      ? this.authService.login(this.formData)
      : this.authService.register(this.formData);

    action$.subscribe({
      next: () => {
        // Erfolg: AuthService leitet automatisch weiter (siehe Schritt AuthService)
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.error || 'Etwas ist schiefgelaufen.');
      }
    });
  }
}