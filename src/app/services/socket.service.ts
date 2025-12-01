// src/app/services/socket.service.ts
import { Injectable, inject } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket: Socket | undefined;
  private readonly authService = inject(AuthService);

  connect(): void {
    const token = this.authService.getToken();
    if (!token || this.socket?.connected) return;

    this.socket = io(environment.wsUrl, {
      auth: { token },
      transports: ['websocket'] // Erzwingt Websocket für bessere Performance
    });

    this.socket.on('connect', () => {
      console.log('✅ Connected to WebSocket');
    });

    this.socket.on('disconnect', () => {
      console.log('❌ Disconnected from WebSocket');
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = undefined;
    }
  }

  // Generische Methode um auf Events zu hören
  on<T>(eventName: string): Observable<T> {
    return new Observable<T>(observer => {
      if (!this.socket) {
        this.connect();
      }
      
      this.socket?.on(eventName, (data: T) => {
        observer.next(data);
      });

      // Cleanup beim Unsubscribe
      return () => this.socket?.off(eventName);
    });
  }

  // Event senden
  emit(eventName: string, data: any): void {
    if (!this.socket) this.connect();
    this.socket?.emit(eventName, data);
  }
}