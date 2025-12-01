// src/app/pages/chat/chat-room/chat-room.component.ts
import { Component, inject, signal, computed, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { BackendService } from '../../../services/backend.service';
import { AuthService } from '../../../services/auth.service';
import { SocketService } from '../../../services/socket.service';
import { Message, ActivityGroup } from '../../../models/types';

@Component({
  selector: 'app-chat-room',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="h-screen bg-[#1c1c2e] flex flex-col">
      
      <!-- Header -->
      <header class="px-4 pt-12 pb-4 bg-[#2e2e42] border-b border-white/5 relative z-10">
        <div class="flex items-center gap-3">
          <button 
            (click)="goBack()"
            class="w-10 h-10 bg-[#1c1c2e] rounded-xl flex items-center justify-center hover:bg-[#3e3e52] transition-colors">
            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
          
          <div 
            (click)="openGroupDetail()"
            class="flex-1 flex items-center gap-3 cursor-pointer">
            <!-- Group Image -->
            <div class="w-11 h-11 rounded-xl overflow-hidden bg-[#3e3e52]">
              @if (group()?.imageUrl) {
                <img [src]="group()?.imageUrl" class="w-full h-full object-cover">
              } @else {
                <div class="w-full h-full flex items-center justify-center text-[#FD7666] font-bold">
                  {{ group()?.title?.charAt(0) || 'G' }}
                </div>
              }
            </div>
            <!-- Group Info -->
            <div class="flex-1 min-w-0">
              <h1 class="font-bold text-white truncate">{{ group()?.title || 'Gruppe' }}</h1>
              <p class="text-xs text-gray-400">{{ group()?.currentMembers }} Mitglieder</p>
            </div>
          </div>

          <!-- Menu Button -->
          <button class="w-10 h-10 hover:bg-[#3e3e52] rounded-xl flex items-center justify-center transition-colors">
            <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"/>
            </svg>
          </button>
        </div>
      </header>

      <!-- Messages -->
      <div #scrollContainer class="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        @if (isLoading()) {
          <!-- Loading -->
          <div class="flex justify-center py-8">
            <div class="w-8 h-8 border-2 border-[#FD7666]/30 border-t-[#FD7666] rounded-full animate-spin"></div>
          </div>
        } @else if (messages().length === 0) {
          <!-- Empty State -->
          <div class="text-center py-16">
            <div class="w-20 h-20 bg-[#2e2e42] rounded-full flex items-center justify-center mx-auto mb-4">
              <svg class="w-10 h-10 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
              </svg>
            </div>
            <p class="text-gray-500">Noch keine Nachrichten</p>
            <p class="text-gray-600 text-sm mt-1">Sei der Erste!</p>
          </div>
        } @else {
          <!-- Date Separator -->
          <div class="flex items-center gap-3 my-4">
            <div class="flex-1 h-px bg-white/10"></div>
            <span class="text-xs text-gray-500">Heute</span>
            <div class="flex-1 h-px bg-white/10"></div>
          </div>

          @for (message of messages(); track message.id) {
            <div 
              class="flex gap-3"
              [class]="isOwnMessage(message) ? 'flex-row-reverse' : ''">
              
              <!-- Avatar (only for others) -->
              @if (!isOwnMessage(message)) {
                <div class="w-8 h-8 rounded-full bg-[#3e3e52] flex-shrink-0 overflow-hidden">
                  @if (message.sender.avatarUrl) {
                    <img [src]="message.sender.avatarUrl" class="w-full h-full object-cover">
                  } @else {
                    <div class="w-full h-full flex items-center justify-center text-xs text-[#FD7666] font-bold">
                      {{ message.sender.username.charAt(0).toUpperCase() }}
                    </div>
                  }
                </div>
              }

              <!-- Message Bubble -->
              <div class="max-w-[75%]">
                <!-- Sender Name (only for others) -->
                @if (!isOwnMessage(message)) {
                  <p class="text-xs text-gray-500 mb-1 ml-1">{{ message.sender.username }}</p>
                }
                
                <div 
                  class="px-4 py-2.5 rounded-2xl"
                  [class]="isOwnMessage(message) 
                    ? 'bg-[#FD7666] text-white rounded-br-sm' 
                    : 'bg-[#2e2e42] text-white rounded-bl-sm'">
                  <p class="text-sm whitespace-pre-wrap break-words">{{ message.content }}</p>
                </div>
                
                <!-- Time -->
                <p 
                  class="text-[10px] text-gray-600 mt-1"
                  [class]="isOwnMessage(message) ? 'text-right mr-1' : 'ml-1'">
                  {{ formatTime(message.createdAt) }}
                </p>
              </div>
            </div>
          }
        }
      </div>

      <!-- Input -->
      <div class="px-4 pb-8 pt-3 bg-[#1c1c2e] border-t border-white/5">
        <div class="flex items-end gap-3">
          <!-- Attachment Button -->
          <button class="w-10 h-10 bg-[#2e2e42] rounded-xl flex items-center justify-center hover:bg-[#3e3e52] transition-colors flex-shrink-0">
            <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
          </button>

          <!-- Text Input -->
          <div class="flex-1 relative">
            <textarea 
              #messageInput
              [(ngModel)]="newMessage"
              (keydown.enter)="onEnterPress($event)"
              placeholder="Nachricht schreiben..."
              rows="1"
              class="w-full bg-[#2e2e42] text-white rounded-2xl px-4 py-3 pr-12 border border-white/5 
                     focus:border-[#FD7666]/50 focus:outline-none resize-none placeholder-gray-600
                     max-h-32 overflow-y-auto"
              style="min-height: 48px;">
            </textarea>
          </div>

          <!-- Send Button -->
          <button 
            (click)="sendMessage()"
            [disabled]="!newMessage.trim() || isSending()"
            class="w-10 h-10 bg-[#FD7666] rounded-xl flex items-center justify-center hover:bg-[#ff5744] 
                   transition-colors flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed">
            @if (isSending()) {
              <div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            } @else {
              <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
              </svg>
            }
          </button>
        </div>
      </div>
    </div>
  `
})
export class ChatRoomComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('scrollContainer') scrollContainer!: ElementRef;
  @ViewChild('messageInput') messageInput!: ElementRef;

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly backend = inject(BackendService);
  private readonly auth = inject(AuthService);
  private readonly socket = inject(SocketService);
  private readonly destroy$ = new Subject<void>();

  groupId = signal<string>('');
  group = signal<ActivityGroup | null>(null);
  messages = signal<Message[]>([]);
  isLoading = signal(true);
  isSending = signal(false);
  newMessage = '';

  private shouldScrollToBottom = true;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('groupId');
    if (id) {
      this.groupId.set(id);
      this.loadGroup();
      this.loadMessages();
      this.subscribeToMessages();
    }
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.socket.leaveGroup(this.groupId());
  }

  private loadGroup(): void {
    this.backend.getGroupById(this.groupId()).subscribe({
      next: (group) => this.group.set(group),
      error: () => this.router.navigate(['/chat'])
    });
  }

  private loadMessages(): void {
    this.backend.getMessages(this.groupId()).subscribe({
      next: (response) => {
        this.messages.set(response.messages);
        this.isLoading.set(false);
        this.shouldScrollToBottom = true;
      },
      error: () => this.isLoading.set(false)
    });
  }

  private subscribeToMessages(): void {
    this.socket.joinGroup(this.groupId());
    
    this.socket.on<Message>('new_message')
      .pipe(takeUntil(this.destroy$))
      .subscribe((message) => {
        if (message.groupId === this.groupId()) {
          this.messages.update(msgs => [...msgs, message]);
          this.shouldScrollToBottom = true;
        }
      });
  }

  isOwnMessage(message: Message): boolean {
    return message.sender.id === this.auth.userId();
  }

  formatTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  }

  onEnterPress(event: KeyboardEvent): void {
    if (!event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  sendMessage(): void {
    const content = this.newMessage.trim();
    if (!content || this.isSending()) return;

    this.isSending.set(true);
    this.newMessage = '';

    this.backend.sendMessage(this.groupId(), content).subscribe({
      next: () => {
        this.isSending.set(false);
        this.shouldScrollToBottom = true;
      },
      error: () => {
        this.isSending.set(false);
        this.newMessage = content; // Restore message on error
      }
    });
  }

  private scrollToBottom(): void {
    if (this.scrollContainer) {
      const el = this.scrollContainer.nativeElement;
      el.scrollTop = el.scrollHeight;
      this.shouldScrollToBottom = false;
    }
  }

  goBack(): void {
    this.router.navigate(['/chat']);
  }

  openGroupDetail(): void {
    this.router.navigate(['/group', this.groupId()]);
  }
}