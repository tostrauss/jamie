// src/app/shared/components/bottom-nav/bottom-nav.component.ts
import { Component, inject, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { NotificationService } from '../../../services/notification.service';

interface NavItem {
  path: string;
  label: string;
  iconOutline: string;
  iconFilled: string;
}

@Component({
  selector: 'app-bottom-nav',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <nav class="fixed bottom-0 left-0 right-0 z-40 bg-[#1c1c2e]/95 backdrop-blur-lg border-t border-white/5 pb-safe-bottom">
      <div class="flex items-center justify-around px-2 py-2">
        
        <!-- Home -->
        <a 
          routerLink="/home"
          routerLinkActive="active-nav"
          #homeActive="routerLinkActive"
          class="nav-item">
          <div class="nav-icon-wrapper" [class.active]="homeActive.isActive">
            @if (homeActive.isActive) {
              <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12.97 2.59a1.5 1.5 0 00-1.94 0l-7.5 6.363A1.5 1.5 0 003 10.097V19.5A1.5 1.5 0 004.5 21h4.75a.75.75 0 00.75-.75V14h4v6.25c0 .414.336.75.75.75h4.75a1.5 1.5 0 001.5-1.5v-9.403a1.5 1.5 0 00-.53-1.144l-7.5-6.363z"/>
              </svg>
            } @else {
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
              </svg>
            }
          </div>
          <span class="nav-label" [class.active]="homeActive.isActive">Home</span>
        </a>

        <!-- Explore -->
        <a 
          routerLink="/explore"
          routerLinkActive="active-nav"
          #exploreActive="routerLinkActive"
          class="nav-item">
          <div class="nav-icon-wrapper" [class.active]="exploreActive.isActive">
            @if (exploreActive.isActive) {
              <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path fill-rule="evenodd" d="M10.5 3.75a6.75 6.75 0 100 13.5 6.75 6.75 0 000-13.5zM2.25 10.5a8.25 8.25 0 1114.59 5.28l4.69 4.69a.75.75 0 11-1.06 1.06l-4.69-4.69A8.25 8.25 0 012.25 10.5z" clip-rule="evenodd"/>
              </svg>
            } @else {
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
            }
          </div>
          <span class="nav-label" [class.active]="exploreActive.isActive">Entdecken</span>
        </a>

        <!-- Create Button (Center, Elevated) -->
        <button 
          (click)="onCreateClick()"
          class="relative -mt-6 w-14 h-14 bg-gradient-to-br from-[#ff7043] to-[#ff5722] rounded-2xl flex items-center justify-center shadow-lg shadow-[#ff7043]/30 hover:shadow-[#ff7043]/50 hover:scale-105 active:scale-95 transition-all">
          <svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/>
          </svg>
          <!-- Pulse animation -->
          <span class="absolute inset-0 rounded-2xl bg-[#ff7043] animate-ping opacity-20"></span>
        </button>

        <!-- Notifications -->
        <a 
          routerLink="/notifications"
          routerLinkActive="active-nav"
          #notifActive="routerLinkActive"
          class="nav-item">
          <div class="nav-icon-wrapper relative" [class.active]="notifActive.isActive">
            @if (notifActive.isActive) {
              <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path fill-rule="evenodd" d="M5.25 9a6.75 6.75 0 0113.5 0v.75c0 2.123.8 4.057 2.118 5.52a.75.75 0 01-.297 1.206c-1.544.57-3.16.99-4.831 1.243a3.75 3.75 0 11-7.48 0 24.585 24.585 0 01-4.831-1.244.75.75 0 01-.298-1.205A8.217 8.217 0 005.25 9.75V9zm4.502 8.9a2.25 2.25 0 104.496 0 25.057 25.057 0 01-4.496 0z" clip-rule="evenodd"/>
              </svg>
            } @else {
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
              </svg>
            }
            
            <!-- Notification Badge -->
            @if (notificationService.unreadCount() > 0) {
              <span class="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-[#ff7043] rounded-full flex items-center justify-center text-[10px] font-bold text-white px-1 animate-bounce-subtle">
                {{ notificationService.unreadCount() > 99 ? '99+' : notificationService.unreadCount() }}
              </span>
            }
          </div>
          <span class="nav-label" [class.active]="notifActive.isActive">Alerts</span>
        </a>

        <!-- Profile -->
        <a 
          routerLink="/profile"
          routerLinkActive="active-nav"
          #profileActive="routerLinkActive"
          class="nav-item">
          <div class="nav-icon-wrapper" [class.active]="profileActive.isActive">
            @if (profileActive.isActive) {
              <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path fill-rule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clip-rule="evenodd"/>
              </svg>
            } @else {
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
              </svg>
            }
          </div>
          <span class="nav-label" [class.active]="profileActive.isActive">Profil</span>
        </a>
      </div>
    </nav>
  `,
  styles: [`
    .nav-item {
      @apply flex flex-col items-center justify-center w-16 py-1 transition-all;
    }

    .nav-icon-wrapper {
      @apply w-10 h-10 flex items-center justify-center rounded-xl transition-all text-gray-500;
    }

    .nav-icon-wrapper.active {
      @apply text-[#ff7043] bg-[#ff7043]/10;
    }

    .nav-icon-wrapper:not(.active):hover {
      @apply text-gray-300 bg-white/5;
    }

    .nav-label {
      @apply text-[10px] mt-1 font-medium text-gray-500 transition-colors;
    }

    .nav-label.active {
      @apply text-[#ff7043];
    }

    @keyframes bounce-subtle {
      0%, 100% {
        transform: translateY(0);
      }
      50% {
        transform: translateY(-2px);
      }
    }

    .animate-bounce-subtle {
      animation: bounce-subtle 2s ease-in-out infinite;
    }
  `]
})
export class BottomNavComponent {
  readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);

  @Output() createClick = new EventEmitter<void>();

  onCreateClick(): void {
    this.createClick.emit();
    // Fallback: Navigate to home with create param
    this.router.navigate(['/home'], { queryParams: { create: 'true' } });
  }
}