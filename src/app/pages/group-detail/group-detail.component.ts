// src/app/pages/group-detail/group-detail.component.ts
import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, switchMap } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { BackendService } from '../../services/backend.service';
import { ToastService } from '../../services/toast.service';
import { ActivityGroup, Participant, CATEGORY_META } from '../../models/types';

type DetailTab = 'info' | 'members' | 'requests';

@Component({
  selector: 'app-group-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-[#1c1c2e] text-white pb-28">
      
      @if (isLoading()) {
        <!-- Loading State -->
        <div class="animate-pulse">
          <div class="h-64 bg-[#2e2e42]"></div>
          <div class="px-5 -mt-8">
            <div class="h-8 bg-[#3e3e52] rounded w-3/4 mb-4"></div>
            <div class="h-4 bg-[#3e3e52] rounded w-1/2 mb-2"></div>
            <div class="h-4 bg-[#3e3e52] rounded w-2/3"></div>
          </div>
        </div>
      } @else if (error()) {
        <!-- Error State -->
        <div class="flex flex-col items-center justify-center min-h-screen px-5">
          <div class="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
            <svg class="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>
          </div>
          <h2 class="text-xl font-bold mb-2">Gruppe nicht gefunden</h2>
          <p class="text-gray-400 text-sm text-center mb-6">{{ error() }}</p>
          <button (click)="goBack()" class="btn-jamie btn-primary px-6 py-3">
            Zurück
          </button>
        </div>
      } @else if (group()) {
        <!-- Hero Image -->
        <div class="relative h-72">
          <img 
            [src]="group()!.imageUrl" 
            [alt]="group()!.title"
            class="w-full h-full object-cover">
          <div class="absolute inset-0 bg-gradient-to-t from-[#1c1c2e] via-[#1c1c2e]/50 to-transparent"></div>
          
          <!-- Back Button -->
          <button 
            (click)="goBack()"
            class="absolute top-4 left-4 mt-safe-top w-10 h-10 bg-black/30 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/50 transition-colors">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
          
          <!-- Actions (for creator) -->
          @if (isCreator()) {
            <div class="absolute top-4 right-4 mt-safe-top flex gap-2">
              <button 
                (click)="openEditModal()"
                class="w-10 h-10 bg-black/30 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/50 transition-colors">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                </svg>
              </button>
              <button 
                (click)="confirmDelete()"
                class="w-10 h-10 bg-red-500/30 backdrop-blur-md rounded-full flex items-center justify-center text-red-400 hover:bg-red-500/50 transition-colors">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
              </button>
            </div>
          }
          
          <!-- Category Badge -->
          <div 
            class="absolute bottom-20 left-5 px-3 py-1.5 rounded-full text-sm font-bold"
            [style.background-color]="getCategoryColor()">
            {{ getCategoryIcon() }} {{ getCategoryName() }}
          </div>
        </div>

        <!-- Content -->
        <div class="px-5 -mt-12 relative z-10">
          
          <!-- Title & Basic Info -->
          <h1 class="text-2xl font-bold mb-2">{{ group()!.title }}</h1>
          
          <div class="flex flex-wrap items-center gap-3 text-sm text-gray-400 mb-4">
            <span class="flex items-center gap-1.5">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
              {{ formatDate(group()!.date) }}
            </span>
            <span class="flex items-center gap-1.5">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
              </svg>
              {{ group()!.location }}, {{ group()!.city }}
            </span>
          </div>

          <!-- Member Count Bar -->
          <div class="bg-[#2e2e42] rounded-2xl p-4 mb-6 border border-white/5">
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm text-gray-400">Teilnehmer</span>
              <span class="text-sm font-bold">
                {{ group()!.currentMembers }}/{{ group()!.maxMembers }}
              </span>
            </div>
            <div class="h-2 bg-[#1c1c2e] rounded-full overflow-hidden">
              <div 
                class="h-full rounded-full transition-all duration-500"
                [class.bg-[#ff7043]]="!isFull()"
                [class.bg-red-500]="isFull()"
                [style.width.%]="(group()!.currentMembers / group()!.maxMembers) * 100">
              </div>
            </div>
            @if (isFull()) {
              <p class="text-xs text-red-400 mt-2">Diese Gruppe ist voll</p>
            }
          </div>

          <!-- Tabs -->
          <div class="flex bg-[#2e2e42] rounded-xl p-1 mb-6 border border-white/5">
            <button 
              (click)="activeTab.set('info')"
              class="flex-1 py-2.5 text-sm font-medium rounded-lg transition-all"
              [class.bg-[#ff7043]]="activeTab() === 'info'"
              [class.text-white]="activeTab() === 'info'"
              [class.text-gray-400]="activeTab() !== 'info'">
              Info
            </button>
            <button 
              (click)="activeTab.set('members')"
              class="flex-1 py-2.5 text-sm font-medium rounded-lg transition-all"
              [class.bg-[#ff7043]]="activeTab() === 'members'"
              [class.text-white]="activeTab() === 'members'"
              [class.text-gray-400]="activeTab() !== 'members'">
              Mitglieder
            </button>
            @if (isCreator() && pendingCount() > 0) {
              <button 
                (click)="activeTab.set('requests')"
                class="flex-1 py-2.5 text-sm font-medium rounded-lg transition-all relative"
                [class.bg-[#ff7043]]="activeTab() === 'requests'"
                [class.text-white]="activeTab() === 'requests'"
                [class.text-gray-400]="activeTab() !== 'requests'">
                Anfragen
                <span class="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 rounded-full text-[10px] font-bold flex items-center justify-center text-black">
                  {{ pendingCount() }}
                </span>
              </button>
            }
          </div>

          <!-- Tab Content -->
          @switch (activeTab()) {
            @case ('info') {
              <!-- Description -->
              <div class="mb-6">
                <h3 class="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Beschreibung</h3>
                <p class="text-gray-300 leading-relaxed">
                  {{ group()!.description || 'Keine Beschreibung vorhanden.' }}
                </p>
              </div>

              <!-- Creator -->
              <div class="mb-6">
                <h3 class="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Erstellt von</h3>
                <div class="flex items-center gap-3 bg-[#2e2e42] rounded-xl p-3 border border-white/5">
                  <div class="w-12 h-12 rounded-full overflow-hidden">
                    <img 
                      [src]="group()!.creator.avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + group()!.creator.id" 
                      [alt]="group()!.creator.username"
                      class="w-full h-full object-cover">
                  </div>
                  <div>
                    <p class="font-semibold">{{ group()!.creator.username }}</p>
                    <p class="text-xs text-gray-500">Organisator</p>
                  </div>
                </div>
              </div>

              <!-- Date Details -->
              <div class="mb-6">
                <h3 class="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Wann & Wo</h3>
                <div class="space-y-3">
                  <div class="flex items-start gap-3 bg-[#2e2e42] rounded-xl p-3 border border-white/5">
                    <div class="w-10 h-10 bg-[#ff7043]/20 rounded-xl flex items-center justify-center flex-shrink-0">
                      <svg class="w-5 h-5 text-[#ff7043]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                      </svg>
                    </div>
                    <div>
                      <p class="font-semibold">{{ formatDateLong(group()!.date) }}</p>
                      <p class="text-xs text-gray-500">{{ formatTime(group()!.date) }} Uhr</p>
                    </div>
                  </div>
                  <div class="flex items-start gap-3 bg-[#2e2e42] rounded-xl p-3 border border-white/5">
                    <div class="w-10 h-10 bg-[#ff7043]/20 rounded-xl flex items-center justify-center flex-shrink-0">
                      <svg class="w-5 h-5 text-[#ff7043]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                      </svg>
                    </div>
                    <div>
                      <p class="font-semibold">{{ group()!.location }}</p>
                      <p class="text-xs text-gray-500">{{ group()!.city }}</p>
                    </div>
                  </div>
                </div>
              </div>
            }

            @case ('members') {
              <div class="space-y-3">
                <!-- Creator -->
                <div class="flex items-center gap-3 bg-[#2e2e42] rounded-xl p-3 border border-white/5">
                  <div class="w-12 h-12 rounded-full overflow-hidden">
                    <img 
                      [src]="group()!.creator.avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + group()!.creator.id" 
                      [alt]="group()!.creator.username"
                      class="w-full h-full object-cover">
                  </div>
                  <div class="flex-1">
                    <p class="font-semibold">{{ group()!.creator.username }}</p>
                    <p class="text-xs text-[#ff7043]">Organisator</p>
                  </div>
                  <span class="text-lg">👑</span>
                </div>

                <!-- Participants -->
                @for (participant of participants(); track participant.id) {
                  <div class="flex items-center gap-3 bg-[#2e2e42] rounded-xl p-3 border border-white/5">
                    <div class="w-12 h-12 rounded-full overflow-hidden">
                      <img 
                        [src]="participant.user.avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + participant.user.id" 
                        [alt]="participant.user.username"
                        class="w-full h-full object-cover">
                    </div>
                    <div class="flex-1">
                      <p class="font-semibold">{{ participant.user.username }}</p>
                      <p class="text-xs text-gray-500">Beigetreten {{ formatRelativeDate(participant.joinedAt) }}</p>
                    </div>
                  </div>
                }

                @if (participants().length === 0) {
                  <p class="text-center text-gray-500 py-8">Noch keine weiteren Mitglieder</p>
                }
              </div>
            }

            @case ('requests') {
              @if (pendingRequests().length === 0) {
                <p class="text-center text-gray-500 py-8">Keine ausstehenden Anfragen</p>
              } @else {
                <div class="space-y-3">
                  @for (request of pendingRequests(); track request.id) {
                    <div class="bg-[#2e2e42] rounded-xl p-4 border border-white/5">
                      <div class="flex items-start gap-3">
                        <div class="w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                          <img 
                            [src]="request.user.avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + request.user.id" 
                            [alt]="request.user.username"
                            class="w-full h-full object-cover">
                        </div>
                        <div class="flex-1 min-w-0">
                          <p class="font-semibold">{{ request.user.username }}</p>
                          <p class="text-xs text-gray-500">{{ formatRelativeDate(request.joinedAt) }}</p>
                          @if (request.message) {
                            <p class="text-sm text-gray-400 mt-2 italic">"{{ request.message }}"</p>
                          }
                        </div>
                      </div>
                      
                      <div class="flex gap-2 mt-4">
                        <button 
                          (click)="approveRequest(request)"
                          [disabled]="processingRequest() === request.id"
                          class="flex-1 btn-jamie btn-primary py-2 text-sm">
                          @if (processingRequest() === request.id) {
                            <span class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                          } @else {
                            Annehmen
                          }
                        </button>
                        <button 
                          (click)="rejectRequest(request)"
                          [disabled]="processingRequest() === request.id"
                          class="flex-1 btn-jamie btn-secondary py-2 text-sm text-red-400 border-red-500/20 hover:bg-red-500/10">
                          Ablehnen
                        </button>
                      </div>
                    </div>
                  }
                </div>
              }
            }
          }
        </div>

        <!-- Bottom Action Bar -->
        <div class="fixed bottom-20 left-0 right-0 px-5 z-30">
          <div class="bg-[#2e2e42]/95 backdrop-blur-lg rounded-2xl p-4 border border-white/10 shadow-2xl">
            @if (isCreator()) {
              <button 
                (click)="navigateToChat()"
                class="w-full btn-jamie btn-primary py-4">
                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                </svg>
                Gruppen-Chat öffnen
              </button>
            } @else if (isMember()) {
              <div class="flex gap-3">
                <button 
                  (click)="navigateToChat()"
                  class="flex-1 btn-jamie btn-primary py-4">
                  <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                  </svg>
                  Chat
                </button>
                <button 
                  (click)="confirmLeave()"
                  [disabled]="isLeaving()"
                  class="btn-jamie btn-secondary py-4 px-6 text-red-400 border-red-500/20">
                  @if (isLeaving()) {
                    <span class="w-5 h-5 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin"></span>
                  } @else {
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                    </svg>
                  }
                </button>
              </div>
            } @else if (isPending()) {
              <button 
                disabled
                class="w-full btn-jamie btn-secondary py-4 cursor-not-allowed">
                <svg class="w-5 h-5 mr-2 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                Anfrage gesendet - warte auf Bestätigung
              </button>
            } @else {
              <button 
                (click)="openJoinModal()"
                [disabled]="isFull() || isJoining()"
                class="w-full btn-jamie btn-primary py-4">
                @if (isJoining()) {
                  <span class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                } @else if (isFull()) {
                  Gruppe ist voll
                } @else {
                  <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/>
                  </svg>
                  Beitreten
                }
              </button>
            }
          </div>
        </div>

        <!-- Join Modal -->
        @if (showJoinModal()) {
          <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div class="absolute inset-0 bg-black/80 backdrop-blur-sm" (click)="closeJoinModal()"></div>
            
            <div class="relative bg-[#2e2e42] w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl border border-white/10 animate-zoom-in">
              <div class="p-5">
                <h3 class="text-lg font-bold mb-4">Gruppe beitreten</h3>
                
                <div class="space-y-4">
                  <div>
                    <label class="text-xs text-gray-400 uppercase font-bold tracking-wider block mb-2">
                      Nachricht an den Organisator (optional)
                    </label>
                    <textarea 
                      [(ngModel)]="joinMessage"
                      rows="3"
                      maxlength="200"
                      placeholder="Stell dich kurz vor..."
                      class="input-jamie resize-none"></textarea>
                    <p class="text-right text-[10px] text-gray-500 mt-1">{{ joinMessage.length }}/200</p>
                  </div>
                  
                  <div class="flex gap-3">
                    <button 
                      (click)="closeJoinModal()"
                      class="flex-1 btn-jamie btn-secondary py-3">
                      Abbrechen
                    </button>
                    <button 
                      (click)="submitJoinRequest()"
                      [disabled]="isJoining()"
                      class="flex-1 btn-jamie btn-primary py-3">
                      @if (isJoining()) {
                        <span class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      } @else {
                        Anfrage senden
                      }
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        }
      }
    </div>
  `
})
export class GroupDetailComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly backend = inject(BackendService);
  private readonly toast = inject(ToastService);
  private readonly destroy$ = new Subject<void>();

  // State
  group = signal<ActivityGroup | null>(null);
  participants = signal<Participant[]>([]);
  pendingRequests = signal<Participant[]>([]);
  isLoading = signal(true);
  error = signal<string | null>(null);
  activeTab = signal<DetailTab>('info');
  
  // Action states
  showJoinModal = signal(false);
  isJoining = signal(false);
  isLeaving = signal(false);
  processingRequest = signal<string | null>(null);
  joinMessage = '';

  // Computed
  readonly isCreator = computed(() => 
    this.group()?.creator.id === this.auth.userId()
  );
  
  readonly isMember = computed(() => 
    this.group()?.isMember === true
  );
  
  readonly isPending = computed(() => 
    this.group()?.isPending === true
  );
  
  readonly isFull = computed(() => 
    (this.group()?.currentMembers ?? 0) >= (this.group()?.maxMembers ?? 0)
  );
  
  readonly pendingCount = computed(() => 
    this.pendingRequests().length
  );

  ngOnInit(): void {
    this.route.params
      .pipe(
        takeUntil(this.destroy$),
        switchMap(params => {
          this.isLoading.set(true);
          this.error.set(null);
          return this.backend.getGroupById(params['id']);
        })
      )
      .subscribe({
        next: (group) => {
          this.group.set(group);
          this.isLoading.set(false);
          this.loadParticipants(group.id);
        },
        error: (err) => {
          this.error.set(err.message || 'Gruppe konnte nicht geladen werden');
          this.isLoading.set(false);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadParticipants(groupId: string): void {
    this.backend.getParticipants(groupId).subscribe({
      next: (response) => {
        this.participants.set(
          response.participants.filter(p => p.status === 'APPROVED')
        );
        if (response.isCreator) {
          this.pendingRequests.set(
            response.participants.filter(p => p.status === 'PENDING')
          );
        }
      },
      error: () => {
        // Silent fail for participants
      }
    });
  }

  // Navigation
  goBack(): void {
    this.router.navigate(['/']);
  }

  navigateToChat(): void {
    this.router.navigate(['/chat'], { 
      queryParams: { group: this.group()?.id } 
    });
  }

  // Join
  openJoinModal(): void {
    this.showJoinModal.set(true);
    this.joinMessage = '';
  }

  closeJoinModal(): void {
    this.showJoinModal.set(false);
  }

  submitJoinRequest(): void {
    if (this.isJoining() || !this.group()) return;

    this.isJoining.set(true);

    this.backend.joinGroup(this.group()!.id, {
      message: this.joinMessage.trim() || undefined
    }).subscribe({
      next: () => {
        this.isJoining.set(false);
        this.closeJoinModal();
        this.group.update(g => g ? { ...g, isPending: true } : null);
        this.toast.success('Anfrage gesendet!');
      },
      error: (err) => {
        this.isJoining.set(false);
        this.toast.error(err.message || 'Anfrage fehlgeschlagen');
      }
    });
  }

  // Leave
  confirmLeave(): void {
    if (confirm('Möchtest du diese Gruppe wirklich verlassen?')) {
      this.leaveGroup();
    }
  }

  private leaveGroup(): void {
    if (this.isLeaving() || !this.group()) return;

    this.isLeaving.set(true);

    this.backend.leaveGroup(this.group()!.id).subscribe({
      next: () => {
        this.isLeaving.set(false);
        this.toast.success('Gruppe verlassen');
        this.router.navigate(['/']);
      },
      error: (err) => {
        this.isLeaving.set(false);
        this.toast.error(err.message || 'Fehler beim Verlassen');
      }
    });
  }

  // Request Management
  approveRequest(request: Participant): void {
    if (this.processingRequest()) return;

    this.processingRequest.set(request.id);

    this.backend.updateParticipantStatus(
      this.group()!.id,
      request.id,
      'APPROVED'
    ).subscribe({
      next: () => {
        this.processingRequest.set(null);
        this.pendingRequests.update(list => list.filter(r => r.id !== request.id));
        this.participants.update(list => [...list, { ...request, status: 'APPROVED' }]);
        this.group.update(g => g ? { ...g, currentMembers: g.currentMembers + 1 } : null);
        this.toast.success(`${request.user.username} wurde hinzugefügt`);
      },
      error: () => {
        this.processingRequest.set(null);
        this.toast.error('Fehler beim Annehmen');
      }
    });
  }

  rejectRequest(request: Participant): void {
    if (this.processingRequest()) return;

    this.processingRequest.set(request.id);

    this.backend.updateParticipantStatus(
      this.group()!.id,
      request.id,
      'REJECTED'
    ).subscribe({
      next: () => {
        this.processingRequest.set(null);
        this.pendingRequests.update(list => list.filter(r => r.id !== request.id));
        this.toast.info('Anfrage abgelehnt');
      },
      error: () => {
        this.processingRequest.set(null);
        this.toast.error('Fehler beim Ablehnen');
      }
    });
  }

  // Delete
  confirmDelete(): void {
    if (confirm('Diese Gruppe wirklich löschen? Dies kann nicht rückgängig gemacht werden.')) {
      this.deleteGroup();
    }
  }

  private deleteGroup(): void {
    if (!this.group()) return;

    this.backend.deleteGroup(this.group()!.id).subscribe({
      next: () => {
        this.toast.success('Gruppe gelöscht');
        this.router.navigate(['/']);
      },
      error: (err) => {
        this.toast.error(err.message || 'Löschen fehlgeschlagen');
      }
    });
  }

  // Edit
  openEditModal(): void {
    // TODO: Implement edit modal
    this.toast.info('Bearbeiten kommt bald!');
  }

  // Helpers
  getCategoryColor(): string {
    return CATEGORY_META[this.group()!.category]?.color || '#ff7043';
  }

  getCategoryIcon(): string {
    return CATEGORY_META[this.group()!.category]?.icon || '✨';
  }

  getCategoryName(): string {
    return CATEGORY_META[this.group()!.category]?.name || this.group()!.category;
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatDateLong(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  formatTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatRelativeDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays === 0) return 'heute';
    if (diffDays === 1) return 'gestern';
    if (diffDays < 7) return `vor ${diffDays} Tagen`;
    
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
  }
}