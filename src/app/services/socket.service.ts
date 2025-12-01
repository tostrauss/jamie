// src/app/services/socket.service.ts
import { Injectable, inject, signal, computed, OnDestroy } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable, Subject, BehaviorSubject, fromEvent, retry, timer } from 'rxjs';
import { takeUntil, filter, take } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

@Injectable({
  providedIn: 'root'
})
export class SocketService implements OnDestroy {
  private socket: Socket | null = null;
  private readonly authService = inject(AuthService);
  private readonly destroy$ = new Subject<void>();
  
  // Connection state
  private readonly _status = signal<ConnectionStatus>('disconnected');
  private readonly _lastError = signal<string | null>(null);
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 5;
  
  // Public signals
  readonly status = this._status.asReadonly();
  readonly lastError = this._lastError.asReadonly();
  readonly isConnected = computed(() => this._status() === 'connected');
  
  // Event cache for offline support
  private readonly pendingEmits: Array<{ event: string; data: any }> = [];

  constructor() {
    // Auto-connect when user logs in
    this.authService.isLoggedIn;
  }

  /**
   * Connect to WebSocket server
   */
  connect(): void {
    const token = this.authService.getToken();
    
    if (!token) {
      console.warn('⚠️ Cannot connect: No auth token');
      this._status.set('disconnected');
      return;
    }

    if (this.socket?.connected) {
      console.log('✅ Already connected');
      return;
    }

    // Disconnect existing socket if any
    this.disconnect(false);

    this._status.set('connecting');
    this._lastError.set(null);

    try {
      this.socket = io(environment.wsUrl, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 10000
      });

      this.setupEventHandlers();
    } catch (error) {
      console.error('Socket creation error:', error);
      this._status.set('error');
      this._lastError.set('Failed to create socket connection');
    }
  }

  /**
   * Setup socket event handlers
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('✅ Connected to WebSocket');
      this._status.set('connected');
      this._lastError.set(null);
      this.reconnectAttempts = 0;
      
      // Flush pending emits
      this.flushPendingEmits();
    });

    this.socket.on('disconnect', (reason) => {
      console.log(`❌ Disconnected: ${reason}`);
      this._status.set('disconnected');
      
      // Auto-reconnect for certain disconnect reasons
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, try to reconnect
        setTimeout(() => this.connect(), 1000);
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error.message);
      this._status.set('error');
      this._lastError.set(error.message);
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Max reconnection attempts reached');
        this.disconnect();
      }
    });

    this.socket.on('error', (error: { message: string }) => {
      console.error('Socket error:', error);
      this._lastError.set(error.message);
    });

    // Reconnection events
    this.socket.io.on('reconnect', (attempt) => {
      console.log(`🔄 Reconnected after ${attempt} attempts`);
      this._status.set('connected');
      this.reconnectAttempts = 0;
    });

    this.socket.io.on('reconnect_attempt', (attempt) => {
      console.log(`🔄 Reconnection attempt ${attempt}`);
      this._status.set('connecting');
    });

    this.socket.io.on('reconnect_failed', () => {
      console.error('Reconnection failed');
      this._status.set('error');
      this._lastError.set('Reconnection failed');
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(clearToken = true): void {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this._status.set('disconnected');
    this.reconnectAttempts = 0;
  }

  /**
   * Listen to socket events
   */
  on<T>(eventName: string): Observable<T> {
    return new Observable<T>(observer => {
      // Connect if not connected
      if (!this.socket) {
        this.connect();
      }

      const handler = (data: T) => {
        observer.next(data);
      };

      // Wait for connection then subscribe
      const checkAndSubscribe = () => {
        if (this.socket) {
          this.socket.on(eventName, handler);
        }
      };

      if (this.socket?.connected) {
        checkAndSubscribe();
      } else {
        // Wait for connection
        const interval = setInterval(() => {
          if (this.socket?.connected) {
            clearInterval(interval);
            checkAndSubscribe();
          }
        }, 100);

        // Timeout after 10 seconds
        setTimeout(() => clearInterval(interval), 10000);
      }

      // Cleanup
      return () => {
        if (this.socket) {
          this.socket.off(eventName, handler);
        }
      };
    });
  }

  /**
   * Emit event to server (with offline queue)
   */
  emit(eventName: string, data?: any): void {
    if (this.socket?.connected) {
      this.socket.emit(eventName, data);
    } else {
      // Queue for later
      console.log(`📦 Queuing emit: ${eventName}`);
      this.pendingEmits.push({ event: eventName, data });
      
      // Try to connect
      if (!this.socket) {
        this.connect();
      }
    }
  }

  /**
   * Join a group room for real-time updates
   */
  joinGroup(groupId: string): void {
    this.emit('join_group', groupId);
  }

  /**
   * Leave a group room
   */
  leaveGroup(groupId: string): void {
    this.emit('leave_group', groupId);
  }

  /**
   * Flush pending emits after reconnection
   */
  private flushPendingEmits(): void {
    if (this.pendingEmits.length === 0) return;
    
    console.log(`📤 Flushing ${this.pendingEmits.length} pending emits`);
    
    while (this.pendingEmits.length > 0) {
      const item = this.pendingEmits.shift();
      if (item && this.socket?.connected) {
        this.socket.emit(item.event, item.data);
      }
    }
  }

  /**
   * Force reconnect
   */
  reconnect(): void {
    this.disconnect(false);
    setTimeout(() => this.connect(), 500);
  }

  /**
   * Cleanup on service destroy
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.disconnect();
  }
}