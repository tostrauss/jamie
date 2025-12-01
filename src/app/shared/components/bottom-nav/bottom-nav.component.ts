// src/app/shared/components/bottom-nav/bottom-nav.component.ts
import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

interface NavItem {
  path: string;
  label: string;
  icon: string;
  activeIcon: string;
}

@Component({
  selector: 'app-bottom-nav',
  standalone: true,
  imports: [CommonModule],
  template: `
    <nav class="fixed bottom-0 left-0 right-0 z-50 bg-[#1c1c2e]/95 backdrop-blur-xl border-t border-white/5 pb-safe">
      <div class="flex items-center justify-around px-2 py-2">
        @for (item of navItems; track item.path; let i = $index) {
          @if (i === 2) {
            <!-- Center Create Button -->
            <button 
              (click)="openCreateModal()"
              class="relative -mt-6 w-14 h-14 bg-gradient-to-br from-[#FD7666] to-[#ff8a65] rounded-2xl 
                     flex items-center justify-center shadow-lg shadow-[#FD7666]/30
                     transform transition-all duration-300 hover:scale-105 active:scale-95">
              <svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/>
              </svg>
              <!-- Pulse Animation -->
              <span class="absolute inset-0 rounded-2xl bg-[#FD7666] animate-ping opacity-20"></span>
            </button>
          } @else {
            <button 
              (click)="navigate(item.path)"
              class="flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-300"
              [class]="isActive(item.path) ? 'text-[#FD7666]' : 'text-gray-500 hover:text-gray-300'">
              <!-- Icon -->
              <div class="relative">
                <svg class="w-6 h-6" [innerHTML]="isActive(item.path) ? item.activeIcon : item.icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"></svg>
                <!-- Notification Badge -->
                @if (item.path === '/chat' && unreadChats() > 0) {
                  <span class="absolute -top-1 -right-1 w-4 h-4 bg-[#FD7666] rounded-full text-[10px] font-bold text-white flex items-center justify-center">
                    {{ unreadChats() > 9 ? '9+' : unreadChats() }}
                  </span>
                }
                @if (item.path === '/notifications' && unreadNotifications() > 0) {
                  <span class="absolute -top-1 -right-1 w-2 h-2 bg-[#FD7666] rounded-full"></span>
                }
              </div>
              <!-- Label -->
              <span class="text-[10px] font-medium">{{ item.label }}</span>
              <!-- Active Indicator -->
              @if (isActive(item.path)) {
                <span class="absolute bottom-0 w-8 h-0.5 bg-[#FD7666] rounded-full"></span>
              }
            </button>
          }
        }
      </div>
    </nav>
  `,
  styles: [`
    .pb-safe { padding-bottom: env(safe-area-inset-bottom, 8px); }
    @keyframes ping {
      75%, 100% { transform: scale(1.5); opacity: 0; }
    }
    .animate-ping { animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite; }
  `]
})
export class BottomNavComponent {
  private readonly router = inject(Router);

  currentPath = signal('/home');
  unreadChats = signal(3);
  unreadNotifications = signal(2);
  showCreateModal = signal(false);

  navItems: NavItem[] = [
    {
      path: '/home',
      label: 'Home',
      icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>',
      activeIcon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>'
    },
    {
      path: '/favorites',
      label: 'Favoriten',
      icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>',
      activeIcon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" fill="currentColor" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>'
    },
    { path: '/create', label: '', icon: '', activeIcon: '' }, // Placeholder for center button
    {
      path: '/chat',
      label: 'Chats',
      icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>',
      activeIcon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>'
    },
    {
      path: '/profile',
      label: 'Profil',
      icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>',
      activeIcon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>'
    }
  ];

  constructor() {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.currentPath.set(event.urlAfterRedirects || event.url);
    });
  }

  isActive(path: string): boolean {
    return this.currentPath().startsWith(path);
  }

  navigate(path: string): void {
    this.router.navigate([path]);
  }

  openCreateModal(): void {
    this.showCreateModal.set(true);
    // Emit event or open modal
  }
}