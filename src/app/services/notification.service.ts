// src/app/services/notification.service.ts
import { Injectable, inject, signal, computed, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subject, interval } from 'rxjs';
import { takeUntil, catchError, tap } from 'rxjs/operators';
import { of } from 'rxjs';
import { SocketService } from './socket.service';
import { ToastService } from './toast.service';
import { environment } from '../../environments/environment';

// ============================================
// TYPES
// ============================================
export type NotificationType = 
  | 'JOIN_REQUEST'
  | 'REQUEST_APPROVED'
  | 'REQUEST_REJECTED'
  | 'NEW_MESSAGE'
  | 'GROUP_UPDATED'
  | 'GROUP_DELETED'
  | 'MEMBER_LEFT'
  | 'REMINDER';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  content: string;
  isRead: boolean;
  groupId?: string;
  group?: {
    id: string;
    title: string;
    imageUrl: string;
    category: string;
  };
  createdAt: string;
}

interface NotificationsResponse {
  notifications: Notification[];
  total: number;
  unreadCount: number;
  hasMore: boolean;
}

// ============================================
// SERVICE
// ============================================
@Injectable({
  providedIn: 'root'
})
export class NotificationService implements OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly socket = inject(SocketService);
  private readonly toast = inject(ToastService);
  private readonly destroy$ = new Subject<void>();
  
  private readonly API_URL = `${environment.apiUrl}/notifications`;

  // State
  private readonly _notifications = signal<Notification[]>([]);
  private readonly _unreadCount = signal<number>(0);
  private readonly _isLoading = signal<boolean>(false);
  private readonly _hasMore = signal<boolean>(true);
  private readonly _total = signal<number>(0);

  // Public readonly signals
  readonly notifications = this._notifications.asReadonly();
  readonly unreadCount = this._unreadCount.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly hasMore = this._hasMore.asReadonly();
  readonly total = this._total.asReadonly();

  // Computed
  readonly hasUnread = computed(() => this._unreadCount() > 0);
  
  readonly groupedNotifications = computed(() => {
    const notifs = this._notifications();
    const today: Notification[] = [];
    const yesterday: Notification[] = [];
    const thisWeek: Notification[] = [];
    const older: Notification[] = [];

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart.getTime() - 86400000);
    const weekStart = new Date(todayStart.getTime() - 7 * 86400000);

    notifs.forEach(n => {
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
  });

  constructor() {
    this.setupSocketListeners();
    this.startPolling();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ============================================
  // SOCKET LISTENERS
  // ============================================
  private setupSocketListeners(): void {
    // Listen for new notifications
    this.socket.on<Notification>('notification')
      .pipe(takeUntil(this.destroy$))
      .subscribe(notification => {
        // Add to list
        this._notifications.update(list => [notification, ...list]);
        this._unreadCount.update(c => c + 1);
        this._total.update(t => t + 1);

        // Show toast based on type
        this.showNotificationToast(notification);
      });

    // Listen for request responses
    this.socket.on<{ groupId: string; status: string; groupTitle: string }>('request_response')
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => {
        if (data.status === 'APPROVED') {
          this.toast.success(`Du wurdest zu "${data.groupTitle}" hinzugefügt! 🎉`);
        } else {
          this.toast.info(`Deine Anfrage für "${data.groupTitle}" wurde abgelehnt.`);
        }
      });
  }

  // ============================================
  // POLLING (Fallback for missed socket events)
  // ============================================
  private startPolling(): void {
    // Poll unread count every 60 seconds
    interval(60000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.fetchUnreadCount();
      });
  }

  // ============================================
  // API METHODS
  // ============================================
  
  /**
   * Load notifications (paginated)
   */
  loadNotifications(reset: boolean = false): void {
    if (this._isLoading()) return;
    if (!reset && !this._hasMore()) return;

    this._isLoading.set(true);

    const offset = reset ? 0 : this._notifications().length;
    const limit = 20;

    this.http.get<NotificationsResponse>(`${this.API_URL}`, {
      params: { limit: limit.toString(), offset: offset.toString() }
    }).pipe(
      takeUntil(this.destroy$),
      catchError(err => {
        console.error('Error loading notifications:', err);
        this.toast.error('Benachrichtigungen konnten nicht geladen werden');
        return of(null);
      })
    ).subscribe(response => {
      this._isLoading.set(false);
      
      if (response) {
        if (reset) {
          this._notifications.set(response.notifications);
        } else {
          this._notifications.update(list => [...list, ...response.notifications]);
        }
        this._unreadCount.set(response.unreadCount);
        this._total.set(response.total);
        this._hasMore.set(response.hasMore);
      }
    });
  }

  /**
   * Load only unread notifications
   */
  loadUnreadOnly(): void {
    this._isLoading.set(true);

    this.http.get<NotificationsResponse>(`${this.API_URL}`, {
      params: { unreadOnly: 'true', limit: '50' }
    }).pipe(
      takeUntil(this.destroy$),
      catchError(err => {
        console.error('Error loading unread:', err);
        return of(null);
      })
    ).subscribe(response => {
      this._isLoading.set(false);
      
      if (response) {
        this._notifications.set(response.notifications);
        this._unreadCount.set(response.unreadCount);
      }
    });
  }

  /**
   * Fetch unread count only (lightweight)
   */
  fetchUnreadCount(): void {
    this.http.get<{ count: number }>(`${this.API_URL}/unread-count`)
      .pipe(
        takeUntil(this.destroy$),
        catchError(() => of({ count: this._unreadCount() }))
      )
      .subscribe(response => {
        this._unreadCount.set(response.count);
      });
  }

  /**
   * Mark specific notifications as read
   */
  markAsRead(notificationIds: string[]): void {
    if (notificationIds.length === 0) return;

    // Optimistic update
    this._notifications.update(list =>
      list.map(n => notificationIds.includes(n.id) ? { ...n, isRead: true } : n)
    );
    this._unreadCount.update(c => Math.max(0, c - notificationIds.length));

    this.http.put(`${this.API_URL}/read`, { notificationIds })
      .pipe(
        takeUntil(this.destroy$),
        catchError(err => {
          console.error('Error marking as read:', err);
          // Revert on error
          this.loadNotifications(true);
          return of(null);
        })
      )
      .subscribe();
  }

  /**
   * Mark single notification as read
   */
  markOneAsRead(notification: Notification): void {
    if (notification.isRead) return;
    this.markAsRead([notification.id]);
  }

  /**
   * Mark all notifications as read
   */
  markAllAsRead(): void {
    if (this._unreadCount() === 0) return;

    // Optimistic update
    this._notifications.update(list =>
      list.map(n => ({ ...n, isRead: true }))
    );
    this._unreadCount.set(0);

    this.http.put(`${this.API_URL}/read-all`, {})
      .pipe(
        takeUntil(this.destroy$),
        catchError(err => {
          console.error('Error marking all as read:', err);
          this.loadNotifications(true);
          return of(null);
        })
      )
      .subscribe(() => {
        this.toast.success('Alle als gelesen markiert');
      });
  }

  /**
   * Delete a notification
   */
  deleteNotification(id: string): void {
    const notification = this._notifications().find(n => n.id === id);
    
    // Optimistic update
    this._notifications.update(list => list.filter(n => n.id !== id));
    this._total.update(t => Math.max(0, t - 1));
    if (notification && !notification.isRead) {
      this._unreadCount.update(c => Math.max(0, c - 1));
    }

    this.http.delete(`${this.API_URL}/${id}`)
      .pipe(
        takeUntil(this.destroy$),
        catchError(err => {
          console.error('Error deleting notification:', err);
          this.loadNotifications(true);
          return of(null);
        })
      )
      .subscribe();
  }

  /**
   * Delete all notifications
   */
  deleteAll(): void {
    // Optimistic update
    this._notifications.set([]);
    this._unreadCount.set(0);
    this._total.set(0);

    this.http.delete(`${this.API_URL}`)
      .pipe(
        takeUntil(this.destroy$),
        catchError(err => {
          console.error('Error deleting all:', err);
          this.loadNotifications(true);
          return of(null);
        })
      )
      .subscribe(() => {
        this.toast.success('Alle Benachrichtigungen gelöscht');
      });
  }

  // ============================================
  // HELPERS
  // ============================================
  
  /**
   * Show toast for new notification
   */
  private showNotificationToast(notification: Notification): void {
    const icon = this.getNotificationIcon(notification.type);
    
    switch (notification.type) {
      case 'JOIN_REQUEST':
        this.toast.info(`${icon} ${notification.content}`);
        break;
      case 'REQUEST_APPROVED':
        this.toast.success(`${icon} ${notification.content}`);
        break;
      case 'REQUEST_REJECTED':
        this.toast.info(`${icon} ${notification.content}`);
        break;
      case 'NEW_MESSAGE':
        // Don't show toast for messages (handled in chat)
        break;
      case 'GROUP_UPDATED':
        this.toast.info(`${icon} ${notification.content}`);
        break;
      case 'GROUP_DELETED':
        this.toast.warning(`${icon} ${notification.content}`);
        break;
      case 'MEMBER_LEFT':
        this.toast.info(`${icon} ${notification.content}`);
        break;
      case 'REMINDER':
        this.toast.info(`${icon} ${notification.content}`);
        break;
      default:
        this.toast.info(notification.content);
    }
  }

  /**
   * Get icon for notification type
   */
  getNotificationIcon(type: NotificationType): string {
    const icons: Record<NotificationType, string> = {
      'JOIN_REQUEST': '🙋',
      'REQUEST_APPROVED': '✅',
      'REQUEST_REJECTED': '❌',
      'NEW_MESSAGE': '💬',
      'GROUP_UPDATED': '📝',
      'GROUP_DELETED': '🗑️',
      'MEMBER_LEFT': '👋',
      'REMINDER': '⏰'
    };
    return icons[type] || '🔔';
  }

  /**
   * Get color for notification type
   */
  getNotificationColor(type: NotificationType): string {
    const colors: Record<NotificationType, string> = {
      'JOIN_REQUEST': '#3b82f6',      // blue
      'REQUEST_APPROVED': '#22c55e',  // green
      'REQUEST_REJECTED': '#ef4444',  // red
      'NEW_MESSAGE': '#ff7043',       // orange (primary)
      'GROUP_UPDATED': '#8b5cf6',     // purple
      'GROUP_DELETED': '#ef4444',     // red
      'MEMBER_LEFT': '#f59e0b',       // amber
      'REMINDER': '#06b6d4'           // cyan
    };
    return colors[type] || '#ff7043';
  }

  /**
   * Format relative time
   */
  formatTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffSecs < 60) return 'Gerade eben';
    if (diffMins < 60) return `vor ${diffMins} Min.`;
    if (diffHours < 24) return `vor ${diffHours} Std.`;
    if (diffDays === 1) return 'Gestern';
    if (diffDays < 7) return `vor ${diffDays} Tagen`;
    
    return date.toLocaleDateString('de-DE', { 
      day: '2-digit', 
      month: '2-digit',
      year: diffDays > 365 ? '2-digit' : undefined
    });
  }

  /**
   * Get route for notification
   */
  getNotificationRoute(notification: Notification): string[] {
    switch (notification.type) {
      case 'JOIN_REQUEST':
        return notification.groupId 
          ? ['/group', notification.groupId] 
          : ['/profile'];
      case 'REQUEST_APPROVED':
      case 'GROUP_UPDATED':
        return notification.groupId 
          ? ['/group', notification.groupId] 
          : ['/'];
      case 'NEW_MESSAGE':
        return notification.groupId 
          ? ['/chat'] 
          : ['/chat'];
      case 'GROUP_DELETED':
        return ['/'];
      case 'MEMBER_LEFT':
        return notification.groupId 
          ? ['/group', notification.groupId] 
          : ['/profile'];
      case 'REMINDER':
        return notification.groupId 
          ? ['/group', notification.groupId] 
          : ['/'];
      default:
        return ['/'];
    }
  }

  /**
   * Get query params for notification route
   */
  getNotificationQueryParams(notification: Notification): Record<string, string> {
    if (notification.type === 'NEW_MESSAGE' && notification.groupId) {
      return { group: notification.groupId };
    }
    if (notification.type === 'JOIN_REQUEST') {
      return { tab: 'requests' };
    }
    return {};
  }

  /**
   * Clear local state (for logout)
   */
  clearState(): void {
    this._notifications.set([]);
    this._unreadCount.set(0);
    this._total.set(0);
    this._hasMore.set(true);
  }
}