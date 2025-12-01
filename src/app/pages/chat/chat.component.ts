// src/app/pages/chat/chat.component.ts
import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { BackendService } from '../../services/backend.service';
import { AuthService } from '../../services/auth.service';
import { SocketService } from '../../services/socket.service';
import { ActivityGroup, Message } from '../../models/types';

type ChatTab = 'groups' | 'direct';

interface ChatPreview {
  id: string;
  type: 'group' | 'direct';
  title: string;
  imageUrl?: string;
  lastMessage?: {
    content: string;
    senderName: string;
    createdAt: string;
  };
  unreadCount: number;
  memberCount?: number;
  isOnline?: boolean;
}

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
          <h1 class="text-2xl font-bold text-[#FD7666]">Nachrichten</h1>
          <div class="flex items-center gap-2">
            <!-- Requests Badge -->
            @if (totalRequests() > 0) {
              <button 
                (click)="showRequests.set(true)"
                class="px-3 py-1.5 bg-[#FD7666]/20 text-[#FD7666] rounded-full text-sm font-medium flex items-center gap-1.5">
                <span>Anfragen</span>
                <span class="w-5 h-5 bg-[#FD7666] rounded-full text-white text-xs flex items-center justify-center">
                  {{ totalRequests() }}
                </span>
              </button>
            }
            <!-- New Chat -->
            <button 
              (click)="openNewChat()"
              class="w-10 h-10 bg-[#2e2e42] rounded-xl flex items-center justify-center hover:bg-[#3e3e52] transition-colors">
              <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Search -->
        <div class="relative mb-4">
          <svg class="w-5 h-5 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <input 
            type="text" 
            [(ngModel)]="searchQuery"
            placeholder="Chats durchsuchen..."
            class="w-full bg-[#2e2e42] text-white rounded-xl pl-12 pr-4 py-3 border border-white/5 focus:border-[#FD7666]/50 focus:outline-none transition-colors placeholder-gray-600">
        </div>

        <!-- Tabs -->
        <div class="flex bg-[#2e2e42] rounded-xl p-1 border border-white/5">
          <button 
            (click)="activeTab.set('groups')"
            class="flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 flex items-center justify-center gap-2"
            [class]="activeTab() === 'groups' ? 'bg-[#FD7666] text-white' : 'text-gray-400 hover:text-white'">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
            </svg>
            <span>Gruppen</span>
            @if (groupUnreadCount() > 0) {
              <span class="w-5 h-5 bg-white/20 rounded-full text-xs flex items-center justify-center">
                {{ groupUnreadCount() }}
              </span>
            }
          </button>
          <button 
            (click)="activeTab.set('direct')"
            class="flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 flex items-center justify-center gap-2"
            [class]="activeTab() === 'direct' ? 'bg-[#FD7666] text-white' : 'text-gray-400 hover:text-white'">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
            </svg>
            <span>Deine Chats</span>
            @if (directUnreadCount() > 0) {
              <span class="w-5 h-5 bg-white/20 rounded-full text-xs flex items-center justify-center">
                {{ directUnreadCount() }}
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
              <div class="flex items-center gap-3 p-3 bg-[#2e2e42] rounded-2xl animate-pulse">
                <div class="w-14 h-14 rounded-xl bg-[#3e3e52]"></div>
                <div class="flex-1">
                  <div class="h-4 bg-[#3e3e52] rounded w-1/3 mb-2"></div>
                  <div class="h-3 bg-[#3e3e52] rounded w-2/3"></div>
                </div>
              </div>
            }
          </div>
        } @else if (filteredChats().length === 0) {
          <!-- Empty State -->
          <div class="text-center py-16">
            <div class="w-24 h-24 bg-[#2e2e42] rounded-full flex items-center justify-center mx-auto mb-4">
              <svg class="w-12 h-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
              </svg>
            </div>
            <h3 class="text-lg font-bold mb-2">Keine Chats</h3>
            <p class="text-gray-500 text-sm mb-6">
              {{ activeTab() === 'groups' ? 'Tritt einer Gruppe bei um zu chatten' : 'Starte eine Unterhaltung' }}
            </p>
            <button 
              (click)="goToExplore()"
              class="px-6 py-3 bg-[#FD7666] hover:bg-[#ff5744] text-white font-medium rounded-xl transition-colors">
              {{ activeTab() === 'groups' ? 'Gruppen entdecken' : 'Leute finden' }}
            </button>
          </div>
        } @else {
          <!-- Chat List -->
          <div class="space-y-2">
            @for (chat of filteredChats(); track chat.id) {
              <div 
                (click)="openChat(chat)"
                class="flex items-center gap-3 p-3 bg-[#2e2e42] rounded-2xl border border-white/5 
                       hover:border-[#FD7666]/30 transition-all duration-300 cursor-pointer group">
                
                <!-- Avatar -->
                <div class="relative">
                  <div class="w-14 h-14 rounded-xl overflow-hidden bg-[#3e3e52]">
                    @if (chat.imageUrl) {
                      <img [src]="chat.imageUrl" class="w-full h-full object-cover">
                    } @else {
                      <div class="w-full h-full flex items-center justify-center text-[#FD7666] font-bold text-lg">
                        {{ chat.title.charAt(0).toUpperCase() }}
                      </div>
                    }
                  </div>
                  <!-- Online Indicator -->
                  @if (chat.type === 'direct' && chat.isOnline) {
                    <span class="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full border-2 border-[#2e2e42]"></span>
                  }
                  <!-- Unread Badge -->
                  @if (chat.unreadCount > 0) {
                    <span class="absolute -top-1 -right-1 w-5 h-5 bg-[#FD7666] rounded-full text-[10px] font-bold text-white flex items-center justify-center">
                      {{ chat.unreadCount > 9 ? '9+' : chat.unreadCount }}
                    </span>
                  }
                </div>

                <!-- Info -->
                <div class="flex-1 min-w-0">
                  <div class="flex items-center justify-between mb-1">
                    <h3 class="font-bold text-white truncate group-hover:text-[#FD7666] transition-colors">
                      {{ chat.title }}
                    </h3>
                    @if (chat.lastMessage) {
                      <span class="text-xs text-gray-500 flex-shrink-0 ml-2">
                        {{ formatTime(chat.lastMessage.createdAt) }}
                      </span>
                    }
                  </div>
                  @if (chat.lastMessage) {
                    <p class="text-sm text-gray-400 truncate">
                      @if (chat.type === 'group') {
                        <span class="text-gray-500">{{ chat.lastMessage.senderName }}:</span>
                      }
                      {{ chat.lastMessage.content }}
                    </p>
                  } @else {
                    <p class="text-sm text-gray-500 italic">Noch keine Nachrichten</p>
                  }
                  @if (chat.type === 'group' && chat.memberCount) {
                    <p class="text-xs text-gray-600 mt-0.5">{{ chat.memberCount }} Mitglieder</p>
                  }
                </div>

                <!-- Arrow -->
                <svg class="w-5 h-5 text-gray-600 group-hover:text-[#FD7666] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                </svg>
              </div>
            }
          </div>
        }
      </section>

      <!-- Requests Modal -->
      @if (showRequests()) {
        <div class="fixed inset-0 z-50 flex items-end justify-center">
          <!-- Backdrop -->
          <div 
            (click)="showRequests.set(false)"
            class="absolute inset-0 bg-black/80 backdrop-blur-sm animate-fade-in">
          </div>
          
          <!-- Modal -->
          <div class="relative bg-[#1c1c2e] rounded-t-3xl w-full max-h-[80vh] overflow-hidden animate-slide-up border-t border-white/10">
            <!-- Handle -->
            <div class="flex justify-center py-3">
              <div class="w-10 h-1 bg-gray-600 rounded-full"></div>
            </div>
            
            <!-- Header -->
            <div class="px-5 pb-4 border-b border-white/5">
              <h2 class="text-xl font-bold text-white">Anfragen</h2>
              <p class="text-sm text-gray-400">{{ totalRequests() }} ausstehende Anfragen</p>
            </div>
            
            <!-- Request List -->
            <div class="p-5 space-y-3 overflow-y-auto max-h-[60vh]">
              @for (request of pendingRequests(); track request.id) {
                <div class="flex items-center gap-3 p-3 bg-[#2e2e42] rounded-2xl">
                  <div class="w-12 h-12 rounded-xl bg-[#3e3e52] overflow-hidden">
                    @if (request.imageUrl) {
                      <img [src]="request.imageUrl" class="w-full h-full object-cover">
                    } @else {
                      <div class="w-full h-full flex items-center justify-center text-[#FD7666] font-bold">
                        {{ request.title.charAt(0) }}
                      </div>
                    }
                  </div>
                  <div class="flex-1 min-w-0">
                    <h4 class="font-bold text-white truncate">{{ request.title }}</h4>
                    <p class="text-xs text-gray-500">{{ request.subtitle }}</p>
                  </div>
                  <div class="flex gap-2">
                    <button 
                      (click)="rejectRequest(request.id)"
                      class="w-10 h-10 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl flex items-center justify-center transition-colors">
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                      </svg>
                    </button>
                    <button 
                      (click)="acceptRequest(request.id)"
                      class="w-10 h-10 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-xl flex items-center justify-center transition-colors">
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                      </svg>
                    </button>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes slideUp {
      from { transform: translateY(100%); }
      to { transform: translateY(0); }
    }
    .animate-fade-in { animation: fadeIn 0.2s ease-out forwards; }
    .animate-slide-up { animation: slideUp 0.3s ease-out forwards; }
  `]
})
export class ChatComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly backend = inject(BackendService);
  private readonly auth = inject(AuthService);
  private readonly socket = inject(SocketService);
  private readonly destroy$ = new Subject<void>();

  activeTab = signal<ChatTab>('groups');
  searchQuery = '';
  isLoading = signal(true);
  showRequests = signal(false);

  groupChats = signal<ChatPreview[]>([]);
  directChats = signal<ChatPreview[]>([]);
  pendingRequests = signal<any[]>([]);

  groupUnreadCount = computed(() => 
    this.groupChats().reduce((sum, c) => sum + c.unreadCount, 0)
  );
  
  directUnreadCount = computed(() => 
    this.directChats().reduce((sum, c) => sum + c.unreadCount, 0)
  );

  totalRequests = computed(() => this.pendingRequests().length);

  filteredChats = computed(() => {
    const chats = this.activeTab() === 'groups' ? this.groupChats() : this.directChats();
    
    if (!this.searchQuery) return chats;
    
    const query = this.searchQuery.toLowerCase();
    return chats.filter(c => c.title.toLowerCase().includes(query));
  });

  ngOnInit(): void {
    this.loadChats();
    this.loadRequests();
    this.subscribeToUpdates();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadChats(): void {
    // Load group chats
    this.backend.getMyGroups().subscribe({
      next: (response) => {
        const chats: ChatPreview[] = response.groups.map((g: ActivityGroup) => ({
          id: g.id,
          type: 'group' as const,
          title: g.title,
          imageUrl: g.imageUrl,
          lastMessage: g.lastMessage ? {
            content: g.lastMessage.content,
            senderName: g.lastMessage.sender?.username || 'Unknown',
            createdAt: g.lastMessage.createdAt
          } : undefined,
          unreadCount: g.unreadCount || 0,
          memberCount: g.currentMembers
        }));
        
        // Sort by last message time
        chats.sort((a, b) => {
          if (!a.lastMessage) return 1;
          if (!b.lastMessage) return -1;
          return new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime();
        });
        
        this.groupChats.set(chats);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });

    // TODO: Load direct chats when implemented
    this.directChats.set([]);
  }

  private loadRequests(): void {
    // TODO: Load pending friend/group requests
    this.pendingRequests.set([]);
  }

  private subscribeToUpdates(): void {
    // Listen for new messages
    this.socket.on<Message>('new_message')
      .pipe(takeUntil(this.destroy$))
      .subscribe((message) => {
        // Update last message for group
        this.groupChats.update(chats => 
          chats.map(chat => {
            if (chat.id === message.groupId) {
              return {
                ...chat,
                lastMessage: {
                  content: message.content,
                  senderName: message.sender.username,
                  createdAt: message.createdAt
                },
                unreadCount: chat.unreadCount + 1
              };
            }
            return chat;
          })
        );
      });
  }

  formatTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    // Today
    if (diff < 24 * 60 * 60 * 1000 && date.getDate() === now.getDate()) {
      return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    }
    
    // Yesterday
    if (diff < 48 * 60 * 60 * 1000) {
      return 'Gestern';
    }
    
    // This week
    if (diff < 7 * 24 * 60 * 60 * 1000) {
      return date.toLocaleDateString('de-DE', { weekday: 'short' });
    }
    
    // Older
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
  }

  openChat(chat: ChatPreview): void {
    if (chat.type === 'group') {
      this.router.navigate(['/chat', chat.id]);
    } else {
      // TODO: Direct chat route
      this.router.navigate(['/chat', 'direct', chat.id]);
    }
  }

  openNewChat(): void {
    // TODO: Open new chat modal
  }

  acceptRequest(id: string): void {
    // TODO: Accept request API
    this.pendingRequests.update(reqs => reqs.filter(r => r.id !== id));
  }

  rejectRequest(id: string): void {
    // TODO: Reject request API
    this.pendingRequests.update(reqs => reqs.filter(r => r.id !== id));
  }

  goToExplore(): void {
    this.router.navigate(['/home']);
  }
}