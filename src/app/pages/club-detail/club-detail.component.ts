// src/app/pages/club-detail/club-detail.component.ts
import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { FavoritesService } from '../../services/favorites.service';
import { CATEGORY_META } from '../../models/types';

interface Club {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  category: string;
  location?: string;
  city: string;
  isPrivate: boolean;
  memberCount: number;
  postCount: number;
  createdAt: string;
  creator: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
  members: Array<{
    user: {
      id: string;
      username: string;
      avatarUrl?: string;
    };
    role: string;
    joinedAt: string;
  }>;
  isCreator: boolean;
  isMember: boolean;
  isPending: boolean;
  userRole?: string;
}

@Component({
  selector: 'app-club-detail',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-[#1c1c2e] text-white pb-24">
      
      @if (isLoading()) {
        <!-- Loading Skeleton -->
        <div class="animate-pulse">
          <div class="h-64 bg-[#2e2e42]"></div>
          <div class="px-5 py-6">
            <div class="h-8 bg-[#2e2e42] rounded w-2/3 mb-4"></div>
            <div class="h-4 bg-[#2e2e42] rounded w-full mb-2"></div>
            <div class="h-4 bg-[#2e2e42] rounded w-3/4"></div>
          </div>
        </div>
      } @else if (club()) {
        <!-- Hero Image -->
        <div class="relative h-72 overflow-hidden">
          @if (club()?.imageUrl) {
            <img 
              [src]="club()?.imageUrl" 
              [alt]="club()?.title"
              class="w-full h-full object-cover">
          } @else {
            <div class="w-full h-full bg-gradient-to-br from-[#FD7666]/30 to-purple-600/30 flex items-center justify-center">
              <span class="text-6xl">{{ getCategoryIcon(club()?.category || '') }}</span>
            </div>
          }
          
          <!-- Gradient Overlay -->
          <div class="absolute inset-0 bg-gradient-to-t from-[#1c1c2e] via-transparent to-transparent"></div>
          
          <!-- Back Button -->
          <button 
            (click)="goBack()"
            class="absolute top-12 left-4 w-10 h-10 bg-black/50 backdrop-blur-xl rounded-xl flex items-center justify-center">
            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
          </button>

          <!-- Actions -->
          <div class="absolute top-12 right-4 flex gap-2">
            <!-- Favorite -->
            <button 
              (click)="toggleFavorite()"
              class="w-10 h-10 bg-black/50 backdrop-blur-xl rounded-xl flex items-center justify-center">
              <svg 
                class="w-5 h-5 transition-colors"
                [class]="isFavorite() ? 'text-[#FD7666] fill-current' : 'text-white'"
                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
              </svg>
            </button>
            
            <!-- Share -->
            <button 
              (click)="shareClub()"
              class="w-10 h-10 bg-black/50 backdrop-blur-xl rounded-xl flex items-center justify-center">
              <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
              </svg>
            </button>

            <!-- More (for creator) -->
            @if (club()?.isCreator) {
              <button 
                (click)="showMoreMenu.set(!showMoreMenu())"
                class="w-10 h-10 bg-black/50 backdrop-blur-xl rounded-xl flex items-center justify-center">
                <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"/>
                </svg>
              </button>
            }
          </div>

          <!-- Category Badge -->
          <span 
            class="absolute bottom-4 left-4 px-3 py-1.5 rounded-xl text-sm font-medium backdrop-blur-xl"
            [style.background]="getCategoryColor(club()?.category || '') + '33'"
            [style.color]="getCategoryColor(club()?.category || '')">
            {{ getCategoryIcon(club()?.category || '') }} {{ getCategoryName(club()?.category || '') }}
          </span>

          <!-- Private Badge -->
          @if (club()?.isPrivate) {
            <span class="absolute bottom-4 right-4 px-3 py-1.5 rounded-xl text-sm font-medium bg-yellow-500/20 text-yellow-400 backdrop-blur-xl flex items-center gap-1">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
              </svg>
              Privat
            </span>
          }
        </div>

        <!-- Content -->
        <div class="px-5 -mt-6 relative z-10">
          <!-- Title & Stats -->
          <div class="mb-6">
            <h1 class="text-2xl font-bold text-white mb-2">{{ club()?.title }}</h1>
            <div class="flex items-center gap-4 text-sm text-gray-400">
              <span class="flex items-center gap-1">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                </svg>
                {{ club()?.memberCount }} Mitglieder
              </span>
              <span class="flex items-center gap-1">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
                {{ club()?.city }}
              </span>
            </div>
          </div>

          <!-- Join/Leave Button -->
          <div class="mb-6">
            @if (club()?.isMember) {
              <div class="flex gap-3">
                <button 
                  (click)="openChat()"
                  class="flex-1 py-4 bg-[#FD7666] hover:bg-[#ff5744] text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                  </svg>
                  Chat öffnen
                </button>
                @if (!club()?.isCreator) {
                  <button 
                    (click)="leaveClub()"
                    [disabled]="isJoining()"
                    class="px-5 py-4 bg-[#2e2e42] hover:bg-red-500/20 text-gray-400 hover:text-red-400 font-bold rounded-xl transition-colors border border-white/5">
                    Verlassen
                  </button>
                }
              </div>
            } @else if (club()?.isPending) {
              <button 
                disabled
                class="w-full py-4 bg-[#2e2e42] text-gray-400 font-bold rounded-xl border border-white/10 flex items-center justify-center gap-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                Anfrage gesendet
              </button>
            } @else {
              <button 
                (click)="joinClub()"
                [disabled]="isJoining()"
                class="w-full py-4 bg-[#FD7666] hover:bg-[#ff5744] text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                @if (isJoining()) {
                  <div class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                } @else {
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/>
                  </svg>
                }
                {{ club()?.isPrivate ? 'Beitritt anfragen' : 'Beitreten' }}
              </button>
            }
          </div>

          <!-- Description -->
          @if (club()?.description) {
            <div class="mb-6 p-4 bg-[#2e2e42] rounded-2xl border border-white/5">
              <h3 class="font-bold text-white mb-2">Über den Club</h3>
              <p class="text-gray-400 text-sm leading-relaxed">{{ club()?.description }}</p>
            </div>
          }

          <!-- Creator -->
          <div class="mb-6 p-4 bg-[#2e2e42] rounded-2xl border border-white/5">
            <h3 class="font-bold text-white mb-3">Erstellt von</h3>
            <div 
              (click)="openProfile(club()?.creator?.id || '')"
              class="flex items-center gap-3 cursor-pointer">
              <div class="w-12 h-12 rounded-xl bg-[#3e3e52] overflow-hidden">
                @if (club()?.creator?.avatarUrl) {
                  <img [src]="club()?.creator?.avatarUrl" class="w-full h-full object-cover">
                } @else {
                  <div class="w-full h-full flex items-center justify-center text-[#FD7666] font-bold">
                    {{ club()?.creator?.username?.charAt(0)?.toUpperCase() }}
                  </div>
                }
              </div>
              <div class="flex-1">
                <p class="font-medium text-white">{{ club()?.creator?.username }}</p>
                <p class="text-xs text-gray-500">Club Owner</p>
              </div>
              <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
              </svg>
            </div>
          </div>

          <!-- Members Preview -->
          <div class="mb-6">
            <div class="flex items-center justify-between mb-3">
              <h3 class="font-bold text-white">Mitglieder ({{ club()?.memberCount }})</h3>
              <button 
                (click)="showAllMembers()"
                class="text-[#FD7666] text-sm font-medium">
                Alle anzeigen
              </button>
            </div>
            <div class="flex flex-wrap gap-3">
              @for (member of club()?.members?.slice(0, 8); track member.user.id) {
                <div 
                  (click)="openProfile(member.user.id)"
                  class="flex flex-col items-center cursor-pointer">
                  <div class="w-14 h-14 rounded-xl bg-[#2e2e42] overflow-hidden border-2 border-white/10 hover:border-[#FD7666]/50 transition-colors">
                    @if (member.user.avatarUrl) {
                      <img [src]="member.user.avatarUrl" class="w-full h-full object-cover">
                    } @else {
                      <div class="w-full h-full flex items-center justify-center text-[#FD7666] font-bold">
                        {{ member.user.username.charAt(0).toUpperCase() }}
                      </div>
                    }
                  </div>
                  <p class="text-xs text-gray-400 mt-1 truncate w-14 text-center">{{ member.user.username }}</p>
                </div>
              }
              @if ((club()?.memberCount || 0) > 8) {
                <div 
                  (click)="showAllMembers()"
                  class="flex flex-col items-center cursor-pointer">
                  <div class="w-14 h-14 rounded-xl bg-[#2e2e42] flex items-center justify-center border-2 border-white/10 hover:border-[#FD7666]/50 transition-colors">
                    <span class="text-sm text-gray-400">+{{ (club()?.memberCount || 0) - 8 }}</span>
                  </div>
                  <p class="text-xs text-gray-400 mt-1">mehr</p>
                </div>
              }
            </div>
          </div>

          <!-- Admin Actions -->
          @if (club()?.isCreator) {
            <div class="p-4 bg-[#2e2e42] rounded-2xl border border-white/5">
              <h3 class="font-bold text-white mb-3">Admin</h3>
              <div class="space-y-2">
                <button 
                  (click)="editClub()"
                  class="w-full p-3 bg-[#3e3e52] hover:bg-[#4e4e62] rounded-xl text-left flex items-center gap-3 transition-colors">
                  <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                  </svg>
                  <span class="text-white">Club bearbeiten</span>
                </button>
                <button 
                  (click)="manageMembers()"
                  class="w-full p-3 bg-[#3e3e52] hover:bg-[#4e4e62] rounded-xl text-left flex items-center gap-3 transition-colors">
                  <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>
                  </svg>
                  <span class="text-white">Mitglieder verwalten</span>
                </button>
                <button 
                  (click)="deleteClub()"
                  class="w-full p-3 bg-red-500/10 hover:bg-red-500/20 rounded-xl text-left flex items-center gap-3 transition-colors">
                  <svg class="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                  </svg>
                  <span class="text-red-400">Club löschen</span>
                </button>
              </div>
            </div>
          }
        </div>
      } @else {
        <!-- Error State -->
        <div class="flex flex-col items-center justify-center min-h-screen px-6">
          <div class="w-24 h-24 bg-[#2e2e42] rounded-full flex items-center justify-center mb-4">
            <svg class="w-12 h-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <h2 class="text-xl font-bold text-white mb-2">Club nicht gefunden</h2>
          <p class="text-gray-500 text-center mb-6">Dieser Club existiert nicht oder wurde gelöscht.</p>
          <button 
            (click)="goBack()"
            class="px-6 py-3 bg-[#FD7666] hover:bg-[#ff5744] text-white font-medium rounded-xl transition-colors">
            Zurück
          </button>
        </div>
      }
    </div>
  `
})
export class ClubDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly favoritesService = inject(FavoritesService);

  club = signal<Club | null>(null);
  isLoading = signal(true);
  isJoining = signal(false);
  showMoreMenu = signal(false);

  isFavorite = computed(() => {
    const c = this.club();
    return c ? this.favoritesService.isFavorite(c.id, 'CLUB') : false;
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadClub(id);
    }
  }

  private loadClub(id: string): void {
    this.http.get<Club>(`${environment.apiUrl}/clubs/${id}`).subscribe({
      next: (club) => {
        this.club.set(club);
        this.isLoading.set(false);
      },
      error: () => {
        this.club.set(null);
        this.isLoading.set(false);
      }
    });
  }

  getCategoryColor(category: string): string {
    return CATEGORY_META[category as keyof typeof CATEGORY_META]?.color || '#FD7666';
  }

  getCategoryIcon(category: string): string {
    return CATEGORY_META[category as keyof typeof CATEGORY_META]?.icon || '✨';
  }

  getCategoryName(category: string): string {
    return CATEGORY_META[category as keyof typeof CATEGORY_META]?.name || category;
  }

  joinClub(): void {
    const c = this.club();
    if (!c) return;

    this.isJoining.set(true);
    this.http.post(`${environment.apiUrl}/clubs/${c.id}/join`, {}).subscribe({
      next: (res: any) => {
        this.isJoining.set(false);
        this.toast.success(res.message);
        this.loadClub(c.id);
      },
      error: (err) => {
        this.isJoining.set(false);
        this.toast.error(err.error?.error || 'Fehler beim Beitreten');
      }
    });
  }

  leaveClub(): void {
    const c = this.club();
    if (!c) return;

    if (!confirm('Möchtest du den Club wirklich verlassen?')) return;

    this.http.delete(`${environment.apiUrl}/clubs/${c.id}/leave`).subscribe({
      next: () => {
        this.toast.success('Du hast den Club verlassen');
        this.loadClub(c.id);
      },
      error: (err) => {
        this.toast.error(err.error?.error || 'Fehler');
      }
    });
  }

  toggleFavorite(): void {
    const c = this.club();
    if (!c) return;
    this.favoritesService.toggleFavorite(c.id, 'CLUB').subscribe();
  }

  shareClub(): void {
    const c = this.club();
    if (!c) return;

    if (navigator.share) {
      navigator.share({
        title: c.title,
        text: `Check out ${c.title} on Jamie!`,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      this.toast.success('Link kopiert!');
    }
  }

  openChat(): void {
    const c = this.club();
    if (c) {
      this.router.navigate(['/chat', 'club', c.id]);
    }
  }

  openProfile(userId: string): void {
    this.router.navigate(['/user', userId]);
  }

  showAllMembers(): void {
    // TODO: Open members modal
  }

  editClub(): void {
    const c = this.club();
    if (c) {
      this.router.navigate(['/club', c.id, 'edit']);
    }
  }

  manageMembers(): void {
    // TODO: Open member management
  }

  deleteClub(): void {
    const c = this.club();
    if (!c) return;

    if (!confirm('Club wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) return;

    this.http.delete(`${environment.apiUrl}/clubs/${c.id}`).subscribe({
      next: () => {
        this.toast.success('Club gelöscht');
        this.router.navigate(['/home']);
      },
      error: (err) => {
        this.toast.error(err.error?.error || 'Fehler beim Löschen');
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/home']);
  }
}