// src/app/pages/notifications/notifications.component.ts
import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { SocketService } from '../../services/socket.service';
import { ToastService } from '../../services/toast.service';

type NotificationType = 
  | 'JOIN_REQUEST' 
  | 'REQUEST_APPROVED' 
  | 'REQUEST_REJECTED'
  | 'NEW_MESSAGE' 
  | 'GROUP_UPDATED'
  | 'GROUP_DELETED'
  | 'MEMBER_JOINED'
  | 'MEMBER_LEFT'
  | 'FRIEND_REQUEST'
  | 'FRIEND_ACCEPTED'
  | 'CLUB_INVITE'
  | 'MENTION'
  | 'SYSTEM';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  imageUrl?: string;
  isRead: boolean;
  createdAt: string;
  // Related entities
  groupId?: string;
  clubId?: string;
  userId?: string;
  // Action data
  actionType?: 'accept_reject' | 'view' | 'none';
  actionData?: any;
}

type NotificationFilter = 'all' | 'unread' | 'requests';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-[#1c1c2e] text-white pb-24">
      
      <!-- Background -->
      <div class="fixed inset-0 pointer-events-none overflow-hidden">
        <div class="absolute top-[-20%] left-[-20%] w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[150px]"></div>
        <div class="absolute bottom-[-20%] right-[-20%] w-[500px] h-[500px] bg-[#FD7666]/10 rounded-full blur-[150px]"></div>
      </div>

      <!-- Header -->
      <header class="px-5 pt-14 pb-4 relative z-10">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-3">
            <button 
              (click)="goBack()"
              class="w-10 h-10 bg-[#2e2e42] rounded-xl flex items-center justify-center hover:bg-[#3e3e52] transition-colors">
              <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
              </svg>
            </button>
            <div>
              <h1 class="text-xl font-bold text-white">Benachrichtigungen</h1>
              @if (unreadCount() > 0) {
                <p class="text-xs text-gray-500">{{ unreadCount() }} ungelesen</p>
              }
            </div>
          </div>
          
          <!-- Mark all as read -->
          @if (unreadCount() > 0) {
            <button 
              (click)="markAllAsRead()"
              class="text-[#FD7666] text-sm font-medium hover:underline">
              Alle gelesen
            </button>
          }
        </div>

        <!-- Filter Tabs -->
        <div class="flex bg-[#2e2e42] rounded-xl p-1 border border-white/5">
          <button 
            (click)="activeFilter.set('all')"
            class="flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-300"
            [class]="activeFilter() === 'all' ? 'bg-[#FD7666] text-white' : 'text-gray-400 hover:text-white'">
            Alle
          </button>
          <button 
            (click)="activeFilter.set('unread')"
            class="flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-300 flex items-center justify-center gap-1"
            [class]="activeFilter() === 'unread' ? 'bg-[#FD7666] text-white' : 'text-gray-400 hover:text-white'">
            Ungelesen
            @if (unreadCount() > 0) {
              <span class="w-5 h-5 bg-white/20 rounded-full text-xs flex items-center justify-center">
                {{ unreadCount() }}
              </span>
            }
          </button>
          <button 
            (click)="activeFilter.set('requests')"
            class="flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-300 flex items-center justify-center gap-1"
            [class]="activeFilter() === 'requests' ? 'bg-[#FD7666] text-white' : 'text-gray-400 hover:text-white'">
            Anfragen
            @if (requestCount() > 0) {
              <span class="w-5 h-5 bg-white/20 rounded-full text-xs flex items-center justify-center">
                {{ requestCount() }}
              </span>
            }
          </button>
        </div>
      </header>

      <!-- Content -->
      <section class="px-5 relative z-10">
        @if (isLoading()) {
          <!-- Loading Skeletons -->
          <div class="space-y-3">
            @for (i of [1,2,3,4,5]; track i) {
              <div class="flex items-start gap-3 p-4 bg-[#2e2e42] rounded-2xl animate-pulse">
                <div class="w-12 h-12 rounded-xl bg-[#3e3e52]"></div>
                <div class="flex-1">
                  <div class="h-4 bg-[#3e3e52] rounded w-3/4 mb-2"></div>
                  <div class="h-3 bg-[#3e3e52] rounded w-1/2"></div>
                </div>
              </div>
            }
          </div>
        } @else if (filteredNotifications().length === 0) {
          <!-- Empty State -->
          <div class="text-center py-16">
            <div class="w-24 h-24 bg-[#2e2e42] rounded-full flex items-center justify-center mx-auto mb-4">
              <svg class="w-12 h-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
              </svg>
            </div>
            <h3 class="text-lg font-bold mb-2">
              @switch (activeFilter()) {
                @case ('all') { Keine Benachrichtigungen }
                @case ('unread') { Alles gelesen! }
                @case ('requests') { Keine Anfragen }
              }
            </h3>
            <p class="text-gray-500 text-sm">
              @switch (activeFilter()) {
                @case ('all') { Du hast noch keine Benachrichtigungen erhalten. }
                @case ('unread') { Du bist auf dem neuesten Stand. }
                @case ('requests') { Keine ausstehenden Anfragen. }
              }
            </p>
          </div>
        } @else {
          <!-- Notifications List -->
          <div class="space-y-2">
            <!-- Today Section -->
            @if (todayNotifications().length > 0) {
              <div class="mb-4">
                <h3 class="text-xs text-gray-500 uppercase font-bold tracking-wider mb-2 px-1">Heute</h3>
                <div class="space-y-2">
                  @for (notification of todayNotifications(); track notification.id) {
                    <ng-container *ngTemplateOutlet="notificationItem; context: { $implicit: notification }"></ng-container>
                  }
                </div>
              </div>
            }

            <!-- Earlier Section -->
            @if (earlierNotifications().length > 0) {
              <div>
                <h3 class="text-xs text-gray-500 uppercase font-bold tracking-wider mb-2 px-1">Früher</h3>
                <div class="space-y-2">
                  @for (notification of earlierNotifications(); track notification.id) {
                    <ng-container *ngTemplateOutlet="notificationItem; context: { $implicit: notification }"></ng-container>
                  }
                </div>
              </div>
            }
          </div>

          <!-- Load More -->
          @if (hasMore()) {
            <div class="text-center py-6">
              <button 
                (click)="loadMore()"
                [disabled]="isLoadingMore()"
                class="px-6 py-2.5 bg-[#2e2e42] hover:bg-[#3e3e52] text-gray-400 font-medium rounded-xl transition-colors disabled:opacity-50">
                @if (isLoadingMore()) {
                  <div class="w-5 h-5 border-2 border-gray-500/30 border-t-gray-500 rounded-full animate-spin mx-auto"></div>
                } @else {
                  Mehr laden
                }
              </button>
            </div>
          }
        }
      </section>

      <!-- Notification Item Template -->
      <ng-template #notificationItem let-notification>
        <div 
          (click)="handleNotificationClick(notification)"
          class="flex items-start gap-3 p-4 rounded-2xl border transition-all duration-300 cursor-pointer group"
          [class]="notification.isRead 
            ? 'bg-[#2e2e42]/50 border-transparent hover:bg-[#2e2e42]' 
            : 'bg-[#2e2e42] border-[#FD7666]/20 hover:border-[#FD7666]/40'">
          
          <!-- Icon/Avatar -->
          <div class="relative flex-shrink-0">
            <div 
              class="w-12 h-12 rounded-xl flex items-center justify-center"
              [class]="getNotificationIconBg(notification.type)">
              @if (notification.imageUrl) {
                <img [src]="notification.imageUrl" class="w-full h-full rounded-xl object-cover">
              } @else {
                <div [innerHTML]="getNotificationIcon(notification.type)" class="w-6 h-6"></div>
              }
            </div>
            <!-- Unread Dot -->
            @if (!notification.isRead) {
              <span class="absolute -top-1 -right-1 w-3 h-3 bg-[#FD7666] rounded-full border-2 border-[#1c1c2e]"></span>
            }
          </div>

          <!-- Content -->
          <div class="flex-1 min-w-0">
            <p class="font-medium text-white text-sm leading-snug">
              {{ notification.title }}
            </p>
            <p class="text-gray-400 text-sm mt-0.5 line-clamp-2">
              {{ notification.message }}
            </p>
            <p class="text-gray-600 text-xs mt-1.5">
              {{ formatTime(notification.createdAt) }}
            </p>

            <!-- Action Buttons (for requests) -->
            @if (notification.actionType === 'accept_reject' && !notification.isRead) {
              <div class="flex gap-2 mt-3">
                <button 
                  (click)="acceptRequest($event, notification)"
                  class="flex-1 py-2 bg-[#FD7666] hover:bg-[#ff5744] text-white text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-1">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                  </svg>
                  Annehmen
                </button>
                <button 
                  (click)="rejectRequest($event, notification)"
                  class="flex-1 py-2 bg-[#3e3e52] hover:bg-red-500/20 text-gray-400 hover:text-red-400 text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-1">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                  Ablehnen
                </button>
              </div>
            }
          </div>

          <!-- Arrow (for view type) -->
          @if (notification.actionType === 'view') {
            <svg class="w-5 h-5 text-gray-600 group-hover:text-[#FD7666] transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
          }

          <!-- Delete Button -->
          <button 
            (click)="deleteNotification($event, notification.id)"
            class="w-8 h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/20 rounded-lg flex-shrink-0">
            <svg class="w-4 h-4 text-gray-500 hover:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
          </button>
        </div>
      </ng-template>
    </div>
  `,
  styles: [`
    .line-clamp-2 {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
  `]
})
export class NotificationsComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  private readonly socket = inject(SocketService);
  private readonly toast = inject(ToastService);
  private readonly destroy$ = new Subject<void>();

  // State
  notifications = signal<Notification[]>([]);
  activeFilter = signal<NotificationFilter>('all');
  isLoading = signal(true);
  isLoadingMore = signal(false);
  hasMore = signal(true);
  offset = 0;
  limit = 20;

  // Computed
  unreadCount = computed(() => 
    this.notifications().filter(n => !n.isRead).length
  );

  requestCount = computed(() => 
    this.notifications().filter(n => 
      !n.isRead && 
      ['JOIN_REQUEST', 'FRIEND_REQUEST', 'CLUB_INVITE'].includes(n.type)
    ).length
  );

  filteredNotifications = computed(() => {
    const filter = this.activeFilter();
    const notifs = this.notifications();

    switch (filter) {
      case 'unread':
        return notifs.filter(n => !n.isRead);
      case 'requests':
        return notifs.filter(n => 
          ['JOIN_REQUEST', 'FRIEND_REQUEST', 'CLUB_INVITE'].includes(n.type)
        );
      default:
        return notifs;
    }
  });

  todayNotifications = computed(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.filteredNotifications().filter(n => 
      new Date(n.createdAt) >= today
    );
  });

  earlierNotifications = computed(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.filteredNotifications().filter(n => 
      new Date(n.createdAt) < today
    );
  });

  ngOnInit(): void {
    this.loadNotifications();
    this.subscribeToRealtime();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadNotifications(): void {
    this.http.get<{ notifications: Notification[]; total: number }>(
      `${environment.apiUrl}/notifications?limit=${this.limit}&offset=${this.offset}`
    ).subscribe({
      next: (response) => {
        this.notifications.set(response.notifications.map(n => ({
          ...n,
          actionType: this.getActionType(n.type)
        })));
        this.hasMore.set(response.notifications.length === this.limit);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        // Load mock data for development
        this.loadMockNotifications();
      }
    });
  }

  private loadMockNotifications(): void {
    const mockNotifications: Notification[] = [
      {
        id: '1',
        type: 'JOIN_REQUEST',
        title: 'Max möchte beitreten',
        message: 'Max hat eine Anfrage für "Volleyball am Strand" gesendet.',
        isRead: false,
        createdAt: new Date().toISOString(),
        groupId: '123',
        actionType: 'accept_reject'
      },
      {
        id: '2',
        type: 'FRIEND_REQUEST',
        title: 'Neue Freundschaftsanfrage',
        message: 'Lisa möchte dich als Freund hinzufügen.',
        imageUrl: 'https://i.pravatar.cc/100?u=lisa',
        isRead: false,
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        userId: '456',
        actionType: 'accept_reject'
      },
      {
        id: '3',
        type: 'REQUEST_APPROVED',
        title: 'Anfrage angenommen! 🎉',
        message: 'Du wurdest zu "Hiking im Englischen Garten" hinzugefügt.',
        isRead: false,
        createdAt: new Date(Date.now() - 7200000).toISOString(),
        groupId: '789',
        actionType: 'view'
      },
      {
        id: '4',
        type: 'NEW_MESSAGE',
        title: 'Neue Nachricht',
        message: 'Tom: "Hey, wann treffen wir uns morgen?"',
        isRead: true,
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        groupId: '123',
        actionType: 'view'
      },
      {
        id: '5',
        type: 'MEMBER_JOINED',
        title: 'Neues Mitglied',
        message: 'Sarah ist deiner Gruppe "Tennis Sonntag" beigetreten.',
        imageUrl: 'https://i.pravatar.cc/100?u=sarah',
        isRead: true,
        createdAt: new Date(Date.now() - 172800000).toISOString(),
        groupId: '456',
        actionType: 'view'
      },
      {
        id: '6',
        type: 'GROUP_UPDATED',
        title: 'Gruppe aktualisiert',
        message: 'Die Zeit für "Beachvolleyball" wurde auf 16:00 geändert.',
        isRead: true,
        createdAt: new Date(Date.now() - 259200000).toISOString(),
        groupId: '789',
        actionType: 'view'
      }
    ];

    this.notifications.set(mockNotifications);
    this.hasMore.set(false);
  }

  private subscribeToRealtime(): void {
    this.socket.on<Notification>('notification')
      .pipe(takeUntil(this.destroy$))
      .subscribe((notification) => {
        this.notifications.update(notifs => [{
          ...notification,
          actionType: this.getActionType(notification.type)
        }, ...notifs]);
      });
  }

  private getActionType(type: NotificationType): 'accept_reject' | 'view' | 'none' {
    switch (type) {
      case 'JOIN_REQUEST':
      case 'FRIEND_REQUEST':
      case 'CLUB_INVITE':
        return 'accept_reject';
      case 'NEW_MESSAGE':
      case 'REQUEST_APPROVED':
      case 'MEMBER_JOINED':
      case 'GROUP_UPDATED':
        return 'view';
      default:
        return 'none';
    }
  }

  getNotificationIconBg(type: NotificationType): string {
    switch (type) {
      case 'JOIN_REQUEST':
      case 'FRIEND_REQUEST':
        return 'bg-blue-500/20';
      case 'REQUEST_APPROVED':
      case 'FRIEND_ACCEPTED':
        return 'bg-green-500/20';
      case 'REQUEST_REJECTED':
        return 'bg-red-500/20';
      case 'NEW_MESSAGE':
        return 'bg-purple-500/20';
      case 'MEMBER_JOINED':
        return 'bg-[#FD7666]/20';
      case 'GROUP_UPDATED':
      case 'CLUB_INVITE':
        return 'bg-yellow-500/20';
      default:
        return 'bg-gray-500/20';
    }
  }

  getNotificationIcon(type: NotificationType): string {
    const iconClass = this.getIconColor(type);
    
    switch (type) {
      case 'JOIN_REQUEST':
        return `<svg class="${iconClass}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/>
        </svg>`;
      case 'FRIEND_REQUEST':
        return `<svg class="${iconClass}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
        </svg>`;
      case 'REQUEST_APPROVED':
      case 'FRIEND_ACCEPTED':
        return `<svg class="${iconClass}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>`;
      case 'REQUEST_REJECTED':
        return `<svg class="${iconClass}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>`;
      case 'NEW_MESSAGE':
        return `<svg class="${iconClass}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
        </svg>`;
      case 'MEMBER_JOINED':
        return `<svg class="${iconClass}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
        </svg>`;
      case 'GROUP_UPDATED':
        return `<svg class="${iconClass}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
        </svg>`;
      case 'CLUB_INVITE':
        return `<svg class="${iconClass}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
        </svg>`;
      default:
        return `<svg class="${iconClass}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
        </svg>`;
    }
  }

  private getIconColor(type: NotificationType): string {
    switch (type) {
      case 'JOIN_REQUEST':
      case 'FRIEND_REQUEST':
        return 'text-blue-400';
      case 'REQUEST_APPROVED':
      case 'FRIEND_ACCEPTED':
        return 'text-green-400';
      case 'REQUEST_REJECTED':
        return 'text-red-400';
      case 'NEW_MESSAGE':
        return 'text-purple-400';
      case 'MEMBER_JOINED':
        return 'text-[#FD7666]';
      case 'GROUP_UPDATED':
      case 'CLUB_INVITE':
        return 'text-yellow-400';
      default:
        return 'text-gray-400';
    }
  }

  formatTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Gerade eben';
    if (minutes < 60) return `vor ${minutes} Min.`;
    if (hours < 24) return `vor ${hours} Std.`;
    if (days < 7) return `vor ${days} Tagen`;
    
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
  }

  // Actions
  handleNotificationClick(notification: Notification): void {
    // Mark as read
    if (!notification.isRead) {
      this.markAsRead(notification.id);
    }

    // Navigate based on type
    if (notification.actionType === 'view') {
      if (notification.groupId) {
        this.router.navigate(['/group', notification.groupId]);
      } else if (notification.clubId) {
        this.router.navigate(['/club', notification.clubId]);
      } else if (notification.userId) {
        this.router.navigate(['/user', notification.userId]);
      }
    }
  }

  markAsRead(id: string): void {
    this.http.patch(`${environment.apiUrl}/notifications/${id}/read`, {}).subscribe({
      next: () => {
        this.notifications.update(notifs => 
          notifs.map(n => n.id === id ? { ...n, isRead: true } : n)
        );
      }
    });
  }

  markAllAsRead(): void {
    this.http.patch(`${environment.apiUrl}/notifications/read-all`, {}).subscribe({
      next: () => {
        this.notifications.update(notifs => 
          notifs.map(n => ({ ...n, isRead: true }))
        );
        this.toast.success('Alle als gelesen markiert');
      }
    });
  }

  acceptRequest(event: Event, notification: Notification): void {
    event.stopPropagation();
    
    const endpoint = notification.type === 'JOIN_REQUEST' 
      ? `/groups/${notification.groupId}/participants/${notification.actionData?.userId}/approve`
      : notification.type === 'FRIEND_REQUEST'
      ? `/friends/${notification.userId}/accept`
      : `/clubs/${notification.clubId}/join/accept`;

    this.http.post(`${environment.apiUrl}${endpoint}`, {}).subscribe({
      next: () => {
        this.markAsRead(notification.id);
        this.toast.success('Anfrage angenommen! 🎉');
      },
      error: () => {
        this.toast.error('Fehler beim Annehmen');
      }
    });
  }

  rejectRequest(event: Event, notification: Notification): void {
    event.stopPropagation();
    
    const endpoint = notification.type === 'JOIN_REQUEST' 
      ? `/groups/${notification.groupId}/participants/${notification.actionData?.userId}/reject`
      : notification.type === 'FRIEND_REQUEST'
      ? `/friends/${notification.userId}/reject`
      : `/clubs/${notification.clubId}/join/reject`;

    this.http.post(`${environment.apiUrl}${endpoint}`, {}).subscribe({
      next: () => {
        this.markAsRead(notification.id);
        this.toast.success('Anfrage abgelehnt');
      },
      error: () => {
        this.toast.error('Fehler beim Ablehnen');
      }
    });
  }

  deleteNotification(event: Event, id: string): void {
    event.stopPropagation();
    
    this.http.delete(`${environment.apiUrl}/notifications/${id}`).subscribe({
      next: () => {
        this.notifications.update(notifs => notifs.filter(n => n.id !== id));
      }
    });
  }

  loadMore(): void {
    if (this.isLoadingMore() || !this.hasMore()) return;
    
    this.isLoadingMore.set(true);
    this.offset += this.limit;

    this.http.get<{ notifications: Notification[] }>(
      `${environment.apiUrl}/notifications?limit=${this.limit}&offset=${this.offset}`
    ).subscribe({
      next: (response) => {
        this.notifications.update(notifs => [...notifs, ...response.notifications.map(n => ({
          ...n,
          actionType: this.getActionType(n.type)
        }))]);
        this.hasMore.set(response.notifications.length === this.limit);
        this.isLoadingMore.set(false);
      },
      error: () => {
        this.isLoadingMore.set(false);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/home']);
  }
}