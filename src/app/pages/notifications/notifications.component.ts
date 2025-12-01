// src/app/pages/notifications/notifications.component.ts
import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { NotificationService, Notification, NotificationType } from '../../services/notification.service';
import { CATEGORY_META } from '../../models/types';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-[#1c1c2e] text-white pb-28">
      
      <!-- Header -->
      <header class="sticky top-0 z-30 bg-[#1c1c2e]/95 backdrop-blur-lg border-b border-white/5">
        <div class="px-5 pt-safe-top">
          <div class="flex items-center justify-between py-4">
            <div class="flex items-center gap-3">
              <button 
                (click)="goBack()"
                class="p-2 -ml-2 hover:bg-white/5 rounded-full transition-colors">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                </svg>
              </button>
              <div>
                <h1 class="text-xl font-bold">Benachrichtigungen</h1>
                <p class="text-xs text-gray-400">
                  @if (notificationService.unreadCount() > 0) {
                    {{ notificationService.unreadCount() }} ungelesen
                  } @else {
                    Alle gelesen
                  }
                </p>
              </div>
            </div>
            
            <!-- Actions -->
            <div class="flex items-center gap-2">
              @if (notificationService.hasUnread()) {
                <button 
                  (click)="markAllAsRead()"
                  class="p-2 hover:bg-white/5 rounded-full transition-colors"
                  title="Alle als gelesen markieren">
                  <svg class="w-5 h-5 text-[#ff7043]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                  </svg>
                </button>
              }
              
              @if (notificationService.notifications().length > 0) {
                <button 
                  (click)="showDeleteConfirm.set(true)"
                  class="p-2 hover:bg-white/5 rounded-full transition-colors"
                  title="Alle löschen">
                  <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                  </svg>
                </button>
              }
            </div>
          </div>

          <!-- Filter Tabs -->
          <div class="flex gap-2 pb-4 overflow-x-auto hide-scrollbar">
            <button 
              (click)="activeFilter.set('all')"
              class="px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all"
              [class.bg-[#ff7043]]="activeFilter() === 'all'"
              [class.text-white]="activeFilter() === 'all'"
              [class.bg-white/5]="activeFilter() !== 'all'"
              [class.text-gray-400]="activeFilter() !== 'all'">
              Alle
            </button>
            <button 
              (click)="activeFilter.set('unread')"
              class="px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all flex items-center gap-2"
              [class.bg-[#ff7043]]="activeFilter() === 'unread'"
              [class.text-white]="activeFilter() === 'unread'"
              [class.bg-white/5]="activeFilter() !== 'unread'"
              [class.text-gray-400]="activeFilter() !== 'unread'">
              Ungelesen
              @if (notificationService.unreadCount() > 0) {
                <span class="w-5 h-5 bg-white/20 rounded-full text-[10px] flex items-center justify-center">
                  {{ notificationService.unreadCount() }}
                </span>
              }
            </button>
            <button 
              (click)="activeFilter.set('requests')"
              class="px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all"
              [class.bg-[#ff7043]]="activeFilter() === 'requests'"
              [class.text-white]="activeFilter() === 'requests'"
              [class.bg-white/5]="activeFilter() !== 'requests'"
              [class.text-gray-400]="activeFilter() !== 'requests'">
              Anfragen
            </button>
            <button 
              (click)="activeFilter.set('messages')"
              class="px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all"
              [class.bg-[#ff7043]]="activeFilter() === 'messages'"
              [class.text-white]="activeFilter() === 'messages'"
              [class.bg-white/5]="activeFilter() !== 'messages'"
              [class.text-gray-400]="activeFilter() !== 'messages'">
              Nachrichten
            </button>
          </div>
        </div>
      </header>

      <!-- Content -->
      <main class="px-4">
        @if (notificationService.isLoading() && notificationService.notifications().length === 0) {
          <!-- Loading Skeletons -->
          <div class="space-y-3 mt-4">
            @for (i of [1,2,3,4,5]; track i) {
              <div class="bg-[#2e2e42] rounded-2xl p-4 animate-pulse">
                <div class="flex gap-4">
                  <div class="w-12 h-12 bg-[#3e3e52] rounded-xl"></div>
                  <div class="flex-1">
                    <div class="h-4 bg-[#3e3e52] rounded w-3/4 mb-2"></div>
                    <div class="h-3 bg-[#3e3e52] rounded w-1/2"></div>
                  </div>
                </div>
              </div>
            }
          </div>
        } @else if (filteredNotifications().length === 0) {
          <!-- Empty State -->
          <div class="text-center py-20">
            <div class="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg class="w-10 h-10 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
              </svg>
            </div>
            <h3 class="text-lg font-semibold mb-2">
              @switch (activeFilter()) {
                @case ('unread') {
                  Keine ungelesenen Benachrichtigungen
                }
                @case ('requests') {
                  Keine Anfragen
                }
                @case ('messages') {
                  Keine Nachrichten-Benachrichtigungen
                }
                @default {
                  Keine Benachrichtigungen
                }
              }
            </h3>
            <p class="text-sm text-gray-400 max-w-xs mx-auto">
              @switch (activeFilter()) {
                @case ('unread') {
                  Du hast alle Benachrichtigungen gelesen! 🎉
                }
                @case ('requests') {
                  Keine ausstehenden Beitrittsanfragen.
                }
                @case ('messages') {
                  Keine neuen Nachrichten verpasst.
                }
                @default {
                  Hier erscheinen Benachrichtigungen über Gruppen, Anfragen und mehr.
                }
              }
            </p>
          </div>
        } @else {
          <!-- Grouped Notifications -->
          <div class="mt-4 space-y-6">
            
            <!-- Today -->
            @if (groupedFiltered().today.length > 0) {
              <section>
                <h2 class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 px-1">
                  Heute
                </h2>
                <div class="space-y-2">
                  @for (notification of groupedFiltered().today; track notification.id) {
                    <ng-container *ngTemplateOutlet="notificationItem; context: { $implicit: notification }"></ng-container>
                  }
                </div>
              </section>
            }

            <!-- Yesterday -->
            @if (groupedFiltered().yesterday.length > 0) {
              <section>
                <h2 class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 px-1">
                  Gestern
                </h2>
                <div class="space-y-2">
                  @for (notification of groupedFiltered().yesterday; track notification.id) {
                    <ng-container *ngTemplateOutlet="notificationItem; context: { $implicit: notification }"></ng-container>
                  }
                </div>
              </section>
            }

            <!-- This Week -->
            @if (groupedFiltered().thisWeek.length > 0) {
              <section>
                <h2 class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 px-1">
                  Diese Woche
                </h2>
                <div class="space-y-2">
                  @for (notification of groupedFiltered().thisWeek; track notification.id) {
                    <ng-container *ngTemplateOutlet="notificationItem; context: { $implicit: notification }"></ng-container>
                  }
                </div>
              </section>
            }

            <!-- Older -->
            @if (groupedFiltered().older.length > 0) {
              <section>
                <h2 class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 px-1">
                  Älter
                </h2>
                <div class="space-y-2">
                  @for (notification of groupedFiltered().older; track notification.id) {
                    <ng-container *ngTemplateOutlet="notificationItem; context: { $implicit: notification }"></ng-container>
                  }
                </div>
              </section>
            }
          </div>

          <!-- Load More -->
          @if (notificationService.hasMore() && activeFilter() === 'all') {
            <div class="py-6 text-center">
              <button 
                (click)="loadMore()"
                [disabled]="notificationService.isLoading()"
                class="btn-jamie btn-secondary px-6 py-3 text-sm">
                @if (notificationService.isLoading()) {
                  <span class="w-4 h-4 border-2 border-gray-400/30 border-t-gray-400 rounded-full animate-spin mr-2"></span>
                  Laden...
                } @else {
                  Mehr laden
                }
              </button>
            </div>
          }
        }
      </main>

      <!-- Notification Item Template -->
      <ng-template #notificationItem let-notification>
        <button 
          (click)="handleNotificationClick(notification)"
          class="w-full bg-[#2e2e42] rounded-2xl p-4 border border-white/5 hover:border-white/10 hover:bg-[#34344b] transition-all text-left relative group"
          [class.border-l-4]="!notification.isRead"
          [style.border-left-color]="!notification.isRead ? getNotificationColor(notification.type) : 'transparent'">
          
          <!-- Swipe to delete hint (visual only) -->
          <div class="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              (click)="deleteNotification($event, notification)"
              class="p-2 hover:bg-red-500/20 rounded-full transition-colors">
              <svg class="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <div class="flex gap-4 pr-8">
            <!-- Icon/Image -->
            <div class="flex-shrink-0">
              @if (notification.group?.imageUrl) {
                <div class="relative">
                  <div class="w-12 h-12 rounded-xl overflow-hidden">
                    <img 
                      [src]="notification.group.imageUrl" 
                      [alt]="notification.group.title"
                      class="w-full h-full object-cover">
                  </div>
                  <span 
                    class="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs"
                    [style.background-color]="getNotificationColor(notification.type)">
                    {{ getNotificationIcon(notification.type) }}
                  </span>
                </div>
              } @else {
                <div 
                  class="w-12 h-12 rounded-xl flex items-center justify-center text-xl"
                  [style.background-color]="getNotificationColor(notification.type) + '20'">
                  {{ getNotificationIcon(notification.type) }}
                </div>
              }
            </div>

            <!-- Content -->
            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between gap-2">
                <h3 
                  class="font-semibold line-clamp-1"
                  [class.text-white]="!notification.isRead"
                  [class.text-gray-300]="notification.isRead">
                  {{ notification.title }}
                </h3>
                <span class="text-[10px] text-gray-500 flex-shrink-0">
                  {{ notificationService.formatTime(notification.createdAt) }}
                </span>
              </div>
              
              <p 
                class="text-sm line-clamp-2 mt-0.5"
                [class.text-gray-300]="!notification.isRead"
                [class.text-gray-500]="notification.isRead">
                {{ notification.content }}
              </p>

              @if (notification.group) {
                <div class="flex items-center gap-2 mt-2">
                  <span 
                    class="text-[10px] px-2 py-0.5 rounded-full"
                    [style.background-color]="getCategoryColor(notification.group.category) + '30'"
                    [style.color]="getCategoryColor(notification.group.category)">
                    {{ getCategoryIcon(notification.group.category) }} {{ notification.group.title }}
                  </span>
                </div>
              }
            </div>
          </div>

          <!-- Unread indicator -->
          @if (!notification.isRead) {
            <span 
              class="absolute top-4 right-4 w-2 h-2 rounded-full"
              [style.background-color]="getNotificationColor(notification.type)">
            </span>
          }
        </button>
      </ng-template>

      <!-- Delete All Confirm Modal -->
      @if (showDeleteConfirm()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-black/80 backdrop-blur-sm" (click)="showDeleteConfirm.set(false)"></div>
          
          <div class="relative bg-[#2e2e42] w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl border border-white/10 animate-zoom-in">
            <div class="p-6 text-center">
              <div class="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg class="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
              </div>
              
              <h3 class="text-lg font-bold mb-2">Alle löschen?</h3>
              <p class="text-sm text-gray-400 mb-6">
                Alle {{ notificationService.total() }} Benachrichtigungen werden unwiderruflich gelöscht.
              </p>
              
              <div class="flex gap-3">
                <button 
                  (click)="showDeleteConfirm.set(false)"
                  class="flex-1 btn-jamie btn-secondary py-3">
                  Abbrechen
                </button>
                <button 
                  (click)="confirmDeleteAll()"
                  class="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-3 rounded-xl transition-colors">
                  Alle löschen
                </button>
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class NotificationsComponent implements OnInit, OnDestroy {
  readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly destroy$ = new Subject<void>();

  // State
  activeFilter = signal<'all' | 'unread' | 'requests' | 'messages'>('all');
  showDeleteConfirm = signal(false);

  // Computed
  filteredNotifications(): Notification[] {
    const all = this.notificationService.notifications();
    
    switch (this.activeFilter()) {
      case 'unread':
        return all.filter(n => !n.isRead);
      case 'requests':
        return all.filter(n => 
          n.type === 'JOIN_REQUEST' || 
          n.type === 'REQUEST_APPROVED' || 
          n.type === 'REQUEST_REJECTED'
        );
      case 'messages':
        return all.filter(n => n.type === 'NEW_MESSAGE');
      default:
        return all;
    }
  }

  groupedFiltered(): { today: Notification[]; yesterday: Notification[]; thisWeek: Notification[]; older: Notification[] } {
    const filtered = this.filteredNotifications();
    const today: Notification[] = [];
    const yesterday: Notification[] = [];
    const thisWeek: Notification[] = [];
    const older: Notification[] = [];

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart.getTime() - 86400000);
    const weekStart = new Date(todayStart.getTime() - 7 * 86400000);

    filtered.forEach(n => {
      const date = new Date(n.createdAt);
      if (date >= todayStart) {
        today.push(n);
      } else if (date >= yesterdayStart) {
        yesterday.push(n);
      } else if (date >= weekStart) {
        thisWeek.push(n);
      } else {
        older.push(n);
      }
    });

    return { today, yesterday, thisWeek, older };
  }

  ngOnInit(): void {
    this.notificationService.loadNotifications(true);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Navigation
  goBack(): void {
    this.router.navigate(['/']);
  }

  // Actions
  handleNotificationClick(notification: Notification): void {
    // Mark as read
    this.notificationService.markOneAsRead(notification);

    // Navigate
    const route = this.notificationService.getNotificationRoute(notification);
    const queryParams = this.notificationService.getNotificationQueryParams(notification);
    
    this.router.navigate(route, { queryParams });
  }

  deleteNotification(event: Event, notification: Notification): void {
    event.stopPropagation();
    this.notificationService.deleteNotification(notification.id);
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead();
  }

  loadMore(): void {
    this.notificationService.loadNotifications(false);
  }

  confirmDeleteAll(): void {
    this.notificationService.deleteAll();
    this.showDeleteConfirm.set(false);
  }

  // Helpers
  getNotificationIcon(type: NotificationType): string {
    return this.notificationService.getNotificationIcon(type);
  }

  getNotificationColor(type: NotificationType): string {
    return this.notificationService.getNotificationColor(type);
  }

  getCategoryColor(category: string): string {
    return CATEGORY_META[category as keyof typeof CATEGORY_META]?.color || '#ff7043';
  }

  getCategoryIcon(category: string): string {
    return CATEGORY_META[category as keyof typeof CATEGORY_META]?.icon || '✨';
  }
}