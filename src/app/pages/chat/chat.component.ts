// src/app/pages/chat/chat.component.ts
import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { SocketService } from '../../services/socket.service';
import { BackendService } from '../../services/backend.service';
import { ToastService } from '../../services/toast.service';
import { ActivityGroup, Message, CATEGORY_META } from '../../models/types';

interface ChatRoom {
  group: ActivityGroup;
  lastMessage: Message | null;
  unreadCount: number;
}

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-[#1c1c2e] text-white pb-28">
      
      <!-- Header -->
      <header class="sticky top-0 z-30 bg-[#1c1c2e]/95 backdrop-blur-lg border-b border-white/5">
        <div class="px-5 pt-safe-top">
          <div class="flex items-center justify-between py-4">
            <div>
              <h1 class="text-xl font-bold">Nachrichten</h1>
              <p class="text-xs text-gray-400">{{ chatRooms().length }} Konversationen</p>
            </div>
            
            <!-- Connection Status -->
            <div class="flex items-center gap-2">
              <span 
                class="w-2 h-2 rounded-full"
                [class.bg-green-500]="isConnected()"
                [class.bg-red-500]="!isConnected()">
              </span>
              <span class="text-xs text-gray-500">
                {{ isConnected() ? 'Online' : 'Offline' }}
              </span>
            </div>
          </div>
          
          <!-- Search -->
          <div class="relative mb-4">
            <input 
              type="text" 
              placeholder="Konversation suchen..." 
              [(ngModel)]="searchQuery"
              class="w-full bg-[#2e2e42] text-gray-200 placeholder-gray-500 rounded-2xl py-3 pl-11 pr-4 border border-white/5 focus:outline-none focus:border-[#ff7043]/50 transition-all text-sm">
            <svg class="w-5 h-5 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
          </div>
        </div>
      </header>

      <!-- Chat List -->
      <main class="px-4">
        @if (isLoading()) {
          <!-- Loading Skeletons -->
          <div class="space-y-3 mt-4">
            @for (i of [1,2,3,4,5]; track i) {
              <div class="bg-[#2e2e42] rounded-2xl p-4 animate-pulse">
                <div class="flex gap-4">
                  <div class="w-14 h-14 bg-[#3e3e52] rounded-xl"></div>
                  <div class="flex-1">
                    <div class="h-4 bg-[#3e3e52] rounded w-3/4 mb-2"></div>
                    <div class="h-3 bg-[#3e3e52] rounded w-1/2"></div>
                  </div>
                </div>
              </div>
            }
          </div>
        } @else if (filteredChatRooms().length === 0) {
          <!-- Empty State -->
          <div class="text-center py-20">
            <div class="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg class="w-10 h-10 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
              </svg>
            </div>
            <h3 class="text-lg font-semibold mb-2">
              @if (searchQuery) {
                Keine Ergebnisse
              } @else {
                Noch keine Chats
              }
            </h3>
            <p class="text-sm text-gray-400 max-w-xs mx-auto">
              @if (searchQuery) {
                Keine Konversationen für "{{ searchQuery }}" gefunden.
              } @else {
                Tritt einer Gruppe bei, um mit anderen zu chatten!
              }
            </p>
          </div>
        } @else {
          <!-- Chat Rooms -->
          <div class="space-y-2 mt-4">
            @for (room of filteredChatRooms(); track room.group.id) {
              <button 
                (click)="openChat(room)"
                class="w-full bg-[#2e2e42] rounded-2xl p-4 border border-white/5 hover:border-white/10 hover:bg-[#34344b] transition-all text-left">
                <div class="flex gap-4">
                  
                  <!-- Group Image -->
                  <div class="relative flex-shrink-0">
                    <div class="w-14 h-14 rounded-xl overflow-hidden">
                      <img 
                        [src]="room.group.imageUrl" 
                        [alt]="room.group.title"
                        class="w-full h-full object-cover">
                    </div>
                    <!-- Category Badge -->
                    <span 
                      class="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs"
                      [style.background-color]="getCategoryColor(room.group.category)">
                      {{ getCategoryIcon(room.group.category) }}
                    </span>
                  </div>
                  
                  <!-- Chat Info -->
                  <div class="flex-1 min-w-0">
                    <div class="flex items-start justify-between gap-2">
                      <h3 class="font-semibold text-white line-clamp-1">
                        {{ room.group.title }}
                      </h3>
                      <div class="flex items-center gap-2 flex-shrink-0">
                        @if (room.lastMessage) {
                          <span class="text-[10px] text-gray-500">
                            {{ formatTime(room.lastMessage.createdAt) }}
                          </span>
                        }
                        @if (room.unreadCount > 0) {
                          <span class="min-w-[20px] h-5 bg-[#ff7043] rounded-full flex items-center justify-center text-[10px] font-bold text-white px-1.5">
                            {{ room.unreadCount > 99 ? '99+' : room.unreadCount }}
                          </span>
                        }
                      </div>
                    </div>
                    
                    <!-- Last Message -->
                    <p class="text-sm text-gray-400 line-clamp-1 mt-0.5">
                      @if (room.lastMessage) {
                        <span class="text-gray-500">{{ room.lastMessage.sender.username }}:</span>
                        {{ room.lastMessage.content }}
                      } @else {
                        <span class="text-gray-500 italic">Noch keine Nachrichten</span>
                      }
                    </p>
                    
                    <!-- Member Count -->
                    <div class="flex items-center gap-1 mt-1.5 text-[10px] text-gray-500">
                      <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
                      </svg>
                      {{ room.group.currentMembers }} Mitglieder
                    </div>
                  </div>
                </div>
              </button>
            }
          </div>
        }
      </main>

      <!-- Chat Detail Modal -->
      @if (activeChat()) {
        <div class="fixed inset-0 z-50 bg-[#1c1c2e] flex flex-col">
          
          <!-- Chat Header -->
          <header class="flex-shrink-0 bg-[#2e2e42] border-b border-white/5 px-4 py-3 pt-safe-top">
            <div class="flex items-center gap-3 pt-2">
              <button 
                (click)="closeChat()"
                class="p-2 -ml-2 hover:bg-white/5 rounded-full transition-colors">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                </svg>
              </button>
              
              <div class="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0">
                <img 
                  [src]="activeChat()!.group.imageUrl" 
                  [alt]="activeChat()!.group.title"
                  class="w-full h-full object-cover">
              </div>
              
              <div class="flex-1 min-w-0">
                <h2 class="font-semibold text-white line-clamp-1">
                  {{ activeChat()!.group.title }}
                </h2>
                <p class="text-xs text-gray-400">
                  {{ activeChat()!.group.currentMembers }} Mitglieder
                </p>
              </div>
              
              <button class="p-2 hover:bg-white/5 rounded-full transition-colors">
                <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"/>
                </svg>
              </button>
            </div>
          </header>

          <!-- Messages -->
          <div 
            #messagesContainer
            class="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            
            @if (messages().length === 0) {
              <div class="text-center py-10">
                <p class="text-gray-500 text-sm">
                  Sei der Erste und schreibe eine Nachricht! 👋
                </p>
              </div>
            }

            @for (message of messages(); track message.id) {
              <div 
                class="flex gap-3"
                [class.flex-row-reverse]="isOwnMessage(message)"
                [class.justify-end]="isOwnMessage(message)">
                
                @if (!isOwnMessage(message)) {
                  <div class="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                    <img 
                      [src]="message.sender.avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + message.sender.id" 
                      [alt]="message.sender.username"
                      class="w-full h-full object-cover">
                  </div>
                }
                
                <div 
                  class="max-w-[75%] rounded-2xl px-4 py-2.5"
                  [class.bg-[#ff7043]]="isOwnMessage(message)"
                  [class.bg-[#2e2e42]]="!isOwnMessage(message)"
                  [class.rounded-br-md]="isOwnMessage(message)"
                  [class.rounded-bl-md]="!isOwnMessage(message)">
                  
                  @if (!isOwnMessage(message)) {
                    <p class="text-xs text-[#ff7043] font-medium mb-1">
                      {{ message.sender.username }}
                    </p>
                  }
                  
                  <p class="text-sm text-white break-words">
                    {{ message.content }}
                  </p>
                  
                  <p 
                    class="text-[10px] mt-1"
                    [class.text-white/60]="isOwnMessage(message)"
                    [class.text-gray-500]="!isOwnMessage(message)">
                    {{ formatMessageTime(message.createdAt) }}
                  </p>
                </div>
              </div>
            }
          </div>

          <!-- Message Input -->
          <div class="flex-shrink-0 bg-[#2e2e42] border-t border-white/5 px-4 py-3 pb-safe-bottom">
            <form (ngSubmit)="sendMessage()" class="flex gap-3">
              <input 
                type="text"
                [(ngModel)]="newMessage"
                name="message"
                placeholder="Nachricht schreiben..."
                class="flex-1 bg-[#1c1c2e] text-white rounded-full px-5 py-3 border border-white/5 focus:outline-none focus:border-[#ff7043]/50 transition-colors text-sm"
                autocomplete="off">
              
              <button 
                type="submit"
                [disabled]="!newMessage.trim() || isSending()"
                class="w-12 h-12 bg-[#ff7043] rounded-full flex items-center justify-center text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#ff8a65] transition-colors">
                @if (isSending()) {
                  <span class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                } @else {
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
                  </svg>
                }
              </button>
            </form>
          </div>
        </div>
      }
    </div>
  `
})
export class ChatComponent implements OnInit, OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly socket = inject(SocketService);
  private readonly backend = inject(BackendService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly destroy$ = new Subject<void>();

  // State
  isLoading = signal(true);
  chatRooms = signal<ChatRoom[]>([]);
  activeChat = signal<ChatRoom | null>(null);
  messages = signal<Message[]>([]);
  newMessage = '';
  searchQuery = '';
  isSending = signal(false);

  // Socket connection
  readonly isConnected = this.socket.isConnected;

  // Computed
  readonly filteredChatRooms = computed(() => {
    const rooms = this.chatRooms();
    const query = this.searchQuery.toLowerCase().trim();
    
    if (!query) return rooms;
    
    return rooms.filter(room => 
      room.group.title.toLowerCase().includes(query) ||
      room.lastMessage?.content.toLowerCase().includes(query)
    );
  });

  ngOnInit(): void {
    this.loadChatRooms();
    this.setupSocketListeners();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    
    // Leave active chat room
    if (this.activeChat()) {
      this.socket.leaveGroup(this.activeChat()!.group.id);
    }
  }

  private loadChatRooms(): void {
    this.isLoading.set(true);
    
    // TODO: Replace with actual API call to get user's chat rooms
    // For now, simulate with timeout
    setTimeout(() => {
      // Mock data - in real app, fetch from backend
      this.chatRooms.set([]);
      this.isLoading.set(false);
    }, 500);
  }

  private setupSocketListeners(): void {
    // Listen for new messages
    this.socket.on<Message>('new_message')
      .pipe(takeUntil(this.destroy$))
      .subscribe(message => {
        // Update messages if in active chat
        if (this.activeChat()?.group.id === message.groupId) {
          this.messages.update(msgs => [...msgs, message]);
          this.scrollToBottom();
        }
        
        // Update last message in chat rooms
        this.chatRooms.update(rooms => 
          rooms.map(room => {
            if (room.group.id === message.groupId) {
              return {
                ...room,
                lastMessage: message,
                unreadCount: this.activeChat()?.group.id === message.groupId 
                  ? 0 
                  : room.unreadCount + 1
              };
            }
            return room;
          })
        );
      });
  }

  openChat(room: ChatRoom): void {
    this.activeChat.set(room);
    this.messages.set([]);
    
    // Join socket room
    this.socket.joinGroup(room.group.id);
    
    // Mark as read
    this.chatRooms.update(rooms =>
      rooms.map(r => r.group.id === room.group.id ? { ...r, unreadCount: 0 } : r)
    );
    
    // Load messages
    this.loadMessages(room.group.id);
    
    // Prevent body scroll
    document.body.classList.add('modal-open');
  }

  closeChat(): void {
    if (this.activeChat()) {
      this.socket.leaveGroup(this.activeChat()!.group.id);
    }
    this.activeChat.set(null);
    this.messages.set([]);
    document.body.classList.remove('modal-open');
  }

  private loadMessages(groupId: string): void {
    // TODO: Fetch messages from backend
    // For now, mock empty
    this.messages.set([]);
  }

  sendMessage(): void {
    const content = this.newMessage.trim();
    if (!content || this.isSending() || !this.activeChat()) return;

    this.isSending.set(true);
    
    const message: Partial<Message> = {
      content,
      groupId: this.activeChat()!.group.id,
      sender: {
        id: this.auth.userId()!,
        username: this.auth.username()!,
        avatarUrl: this.auth.userAvatar()
      },
      createdAt: new Date().toISOString()
    };

    // Optimistic update
    const tempId = 'temp_' + Date.now();
    this.messages.update(msgs => [...msgs, { ...message, id: tempId } as Message]);
    this.newMessage = '';
    this.scrollToBottom();

    // Send via socket
    this.socket.emit('send_message', {
      groupId: this.activeChat()!.group.id,
      content
    });

    // TODO: Replace with actual API call
    setTimeout(() => {
      this.isSending.set(false);
    }, 300);
  }

  isOwnMessage(message: Message): boolean {
    return message.sender.id === this.auth.userId();
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      const container = document.querySelector('[#messagesContainer]');
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }, 50);
  }

  // Helpers
  getCategoryColor(category: string): string {
    return CATEGORY_META[category as keyof typeof CATEGORY_META]?.color || '#ff7043';
  }

  getCategoryIcon(category: string): string {
    return CATEGORY_META[category as keyof typeof CATEGORY_META]?.icon || '✨';
  }

  formatTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Jetzt';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
  }

  formatMessageTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  }
}