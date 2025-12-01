// src/app/app.ts
import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from './services/auth.service';
import { SocketService } from './services/socket.service';
import { NotificationService } from './services/notification.service';
import { ToastService } from './services/toast.service';
import { BottomNavComponent } from './shared/components/bottom-nav/bottom-nav.component';
import { CreateModalComponent } from './shared/components/modal/create-modal/create-modal.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule, 
    RouterOutlet, 
    BottomNavComponent,
    CreateModalComponent
  ],
  template: `
    <!-- Main Content -->
    <main 
      class="min-h-screen bg-[#1c1c2e]"
      [class.pb-24]="showBottomNav">
      <router-outlet />
    </main>

    <!-- Bottom Navigation -->
    @if (showBottomNav) {
      <app-bottom-nav (createClick)="openCreateModal()" />
    }

    <!-- Create Modal -->
    @if (showCreateModal) {
      <app-create-modal 
        (close)="closeCreateModal()"
        (created)="onGroupCreated($event)" />
    }

    <!-- Toast Container -->
    <div class="fixed top-4 right-4 z-[100] space-y-2 max-w-sm w-full px-4 pt-safe-top">
      @for (toast of toasts(); track toast.id) {
        <div 
          class="flex items-start gap-3 p-4 rounded-2xl shadow-2xl border backdrop-blur-lg animate-slide-in-right"
          [class.bg-green-500/20]="toast.type === 'success'"
          [class.border-green-500/30]="toast.type === 'success'"
          [class.bg-red-500/20]="toast.type === 'error'"
          [class.border-red-500/30]="toast.type === 'error'"
          [class.bg-blue-500/20]="toast.type === 'info'"
          [class.border-blue-500/30]="toast.type === 'info'"
          [class.bg-yellow-500/20]="toast.type === 'warning'"
          [class.border-yellow-500/30]="toast.type === 'warning'">
          
          <!-- Icon -->
          <div class="flex-shrink-0 mt-0.5">
            @switch (toast.type) {
              @case ('success') {
                <svg class="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
              }
              @case ('error') {
                <svg class="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              }
              @case ('warning') {
                <svg class="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                </svg>
              }
              @default {
                <svg class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              }
            }
          </div>

          <!-- Message -->
          <p class="text-sm text-white flex-1">{{ toast.message }}</p>

          <!-- Close -->
          <button 
            (click)="dismissToast(toast.id)"
            class="flex-shrink-0 text-gray-400 hover:text-white transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      }
    </div>

    <!-- Connection Lost Indicator -->
    @if (auth.isAuthenticated() && !socketConnected()) {
      <div class="fixed top-0 left-0 right-0 bg-red-500/90 backdrop-blur-sm text-white text-xs text-center py-2 z-[90] pt-safe-top">
        <div class="flex items-center justify-center gap-2 pt-1">
          <span class="w-2 h-2 bg-white rounded-full animate-pulse"></span>
          Verbindung wird hergestellt...
        </div>
      </div>
    }
  `,
  styles: [`
    @keyframes slide-in-right {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    .animate-slide-in-right {
      animation: slide-in-right 0.3s ease-out;
    }
  `]
})
export class App implements OnInit, OnDestroy {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly socket = inject(SocketService);
  private readonly notifications = inject(NotificationService);
  private readonly toastService = inject(ToastService);
  private readonly destroy$ = new Subject<void>();

  // State
  showBottomNav = false;
  showCreateModal = false;

  // Signals
  readonly toasts = this.toastService.toasts;
  readonly socketConnected = this.socket.isConnected;

  // Routes where bottom nav should be hidden
  private readonly hideNavRoutes = [
    '/login',
    '/register',
    '/forgot-password',
    '/about',
    '/privacy',
    '/terms',
    '/imprint',
    '/not-found'
  ];

  ngOnInit(): void {
    this.setupRouteListener();
    this.initializeApp();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupRouteListener(): void {
    // Initial check
    this.updateBottomNavVisibility(this.router.url);

    // Listen to route changes
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe((event: NavigationEnd) => {
        this.updateBottomNavVisibility(event.urlAfterRedirects);
        
        // Scroll to top on navigation
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
  }

  private updateBottomNavVisibility(url: string): void {
    const isAuthRoute = this.hideNavRoutes.some(route => url.startsWith(route));
    this.showBottomNav = this.auth.isAuthenticated() && !isAuthRoute;
  }

  private initializeApp(): void {
    // Load notifications if authenticated
    if (this.auth.isAuthenticated()) {
      this.notifications.fetchUnreadCount();
    }

    // Listen for auth changes
    // When user logs in, fetch notifications
    // When user logs out, clear state
  }

  // Create Modal
  openCreateModal(): void {
    this.showCreateModal = true;
    document.body.classList.add('modal-open');
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
    document.body.classList.remove('modal-open');
  }

  onGroupCreated(group: any): void {
    this.closeCreateModal();
    // Navigate to the new group
    this.router.navigate(['/group', group.id]);
  }

  // Toast
  dismissToast(id: string): void {
    this.toastService.dismiss(id);
  }
}