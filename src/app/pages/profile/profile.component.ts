// src/app/pages/profile/profile.component.ts
import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { BackendService } from '../../services/backend.service';
import { ToastService } from '../../services/toast.service';
import { ActivityGroup, CITIES, CATEGORY_META } from '../../models/types';

type ProfileTab = 'created' | 'joined' | 'pending';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-[#1c1c2e] text-white pb-28">
      
      <!-- Header -->
      <header class="relative">
        <!-- Background Gradient -->
        <div class="h-32 bg-gradient-to-br from-[#ff7043] to-[#ff8a65] relative overflow-hidden">
          <div class="absolute inset-0 bg-black/20"></div>
          <div class="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
        </div>
        
        <!-- Avatar -->
        <div class="px-5 -mt-16 relative z-10">
          <div class="flex items-end gap-4">
            <div class="relative">
              <div class="w-28 h-28 rounded-2xl border-4 border-[#1c1c2e] overflow-hidden bg-[#2e2e42] shadow-xl">
                <img 
                  [src]="userAvatar()" 
                  alt="Profilbild"
                  class="w-full h-full object-cover">
              </div>
              <button 
                (click)="openEditModal()"
                class="absolute -bottom-2 -right-2 w-8 h-8 bg-[#ff7043] rounded-full flex items-center justify-center shadow-lg hover:bg-[#ff8a65] transition-colors">
                <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                </svg>
              </button>
            </div>
            
            <div class="pb-2">
              <h1 class="text-2xl font-bold">{{ username() }}</h1>
              <p class="text-gray-400 text-sm flex items-center gap-1">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                </svg>
                {{ userCity() || 'Keine Stadt angegeben' }}
              </p>
            </div>
          </div>
        </div>
      </header>

      <!-- Stats -->
      <section class="px-5 mt-6">
        <div class="grid grid-cols-3 gap-3">
          <div class="bg-[#2e2e42] rounded-2xl p-4 text-center border border-white/5">
            <p class="text-2xl font-bold text-[#ff7043]">{{ stats().created }}</p>
            <p class="text-xs text-gray-400 mt-1">Erstellt</p>
          </div>
          <div class="bg-[#2e2e42] rounded-2xl p-4 text-center border border-white/5">
            <p class="text-2xl font-bold text-green-400">{{ stats().joined }}</p>
            <p class="text-xs text-gray-400 mt-1">Beigetreten</p>
          </div>
          <div class="bg-[#2e2e42] rounded-2xl p-4 text-center border border-white/5">
            <p class="text-2xl font-bold text-yellow-400">{{ stats().pending }}</p>
            <p class="text-xs text-gray-400 mt-1">Ausstehend</p>
          </div>
        </div>
      </section>

      <!-- Bio -->
      @if (userBio()) {
        <section class="px-5 mt-6">
          <div class="bg-[#2e2e42] rounded-2xl p-4 border border-white/5">
            <p class="text-sm text-gray-300">{{ userBio() }}</p>
          </div>
        </section>
      }

      <!-- Tabs -->
      <section class="px-5 mt-6">
        <div class="flex bg-[#2e2e42] rounded-xl p-1 border border-white/5">
          <button 
            (click)="activeTab.set('created')"
            class="flex-1 py-2.5 text-sm font-medium rounded-lg transition-all"
            [class.bg-[#ff7043]]="activeTab() === 'created'"
            [class.text-white]="activeTab() === 'created'"
            [class.text-gray-400]="activeTab() !== 'created'">
            Meine Gruppen
          </button>
          <button 
            (click)="activeTab.set('joined')"
            class="flex-1 py-2.5 text-sm font-medium rounded-lg transition-all"
            [class.bg-[#ff7043]]="activeTab() === 'joined'"
            [class.text-white]="activeTab() === 'joined'"
            [class.text-gray-400]="activeTab() !== 'joined'">
            Beigetreten
          </button>
          <button 
            (click)="activeTab.set('pending')"
            class="flex-1 py-2.5 text-sm font-medium rounded-lg transition-all relative"
            [class.bg-[#ff7043]]="activeTab() === 'pending'"
            [class.text-white]="activeTab() === 'pending'"
            [class.text-gray-400]="activeTab() !== 'pending'">
            Anfragen
            @if (stats().pending > 0) {
              <span class="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 rounded-full text-[10px] font-bold flex items-center justify-center text-black">
                {{ stats().pending }}
              </span>
            }
          </button>
        </div>
      </section>

      <!-- Group Lists -->
      <section class="px-5 mt-4">
        @if (isLoading()) {
          <div class="space-y-3">
            @for (i of [1,2,3]; track i) {
              <div class="bg-[#2e2e42] rounded-2xl p-4 animate-pulse border border-white/5">
                <div class="flex gap-4">
                  <div class="w-16 h-16 bg-[#3e3e52] rounded-xl"></div>
                  <div class="flex-1">
                    <div class="h-4 bg-[#3e3e52] rounded w-3/4 mb-2"></div>
                    <div class="h-3 bg-[#3e3e52] rounded w-1/2"></div>
                  </div>
                </div>
              </div>
            }
          </div>
        } @else if (currentGroups().length === 0) {
          <div class="text-center py-12">
            <div class="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg class="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
              </svg>
            </div>
            <p class="text-gray-400 text-sm">
              @switch (activeTab()) {
                @case ('created') { Du hast noch keine Gruppen erstellt. }
                @case ('joined') { Du bist noch keiner Gruppe beigetreten. }
                @case ('pending') { Keine ausstehenden Anfragen. }
              }
            </p>
          </div>
        } @else {
          <div class="space-y-3">
            @for (group of currentGroups(); track group.id) {
              <div class="bg-[#2e2e42] rounded-2xl p-4 border border-white/5 hover:border-white/10 transition-all">
                <div class="flex gap-4">
                  <!-- Image -->
                  <div class="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
                    <img 
                      [src]="group.imageUrl" 
                      [alt]="group.title"
                      class="w-full h-full object-cover">
                  </div>
                  
                  <!-- Info -->
                  <div class="flex-1 min-w-0">
                    <div class="flex items-start justify-between gap-2">
                      <h3 class="font-semibold text-white line-clamp-1">{{ group.title }}</h3>
                      <span 
                        class="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                        [style.background-color]="getCategoryColor(group.category) + '33'"
                        [style.color]="getCategoryColor(group.category)">
                        {{ getCategoryIcon(group.category) }}
                      </span>
                    </div>
                    
                    <p class="text-xs text-gray-400 mt-1 flex items-center gap-2">
                      <span class="flex items-center gap-1">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                        </svg>
                        {{ formatDate(group.date) }}
                      </span>
                      <span>•</span>
                      <span>{{ group.currentMembers }}/{{ group.maxMembers }}</span>
                    </p>
                    
                    <!-- Actions based on tab -->
                    <div class="mt-2 flex gap-2">
                      @switch (activeTab()) {
                        @case ('created') {
                          <button 
                            (click)="editGroup(group)"
                            class="text-xs text-[#ff7043] font-medium hover:underline">
                            Bearbeiten
                          </button>
                          <button 
                            (click)="deleteGroup(group)"
                            class="text-xs text-red-400 font-medium hover:underline">
                            Löschen
                          </button>
                        }
                        @case ('joined') {
                          <button 
                            (click)="leaveGroup(group)"
                            class="text-xs text-red-400 font-medium hover:underline">
                            Verlassen
                          </button>
                        }
                        @case ('pending') {
                          <span class="text-xs text-yellow-400">Warte auf Bestätigung...</span>
                        }
                      }
                    </div>
                  </div>
                </div>
              </div>
            }
          </div>
        }
      </section>

      <!-- Settings Section -->
      <section class="px-5 mt-8">
        <h2 class="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Einstellungen</h2>
        
        <div class="bg-[#2e2e42] rounded-2xl border border-white/5 overflow-hidden">
          <button 
            (click)="openEditModal()"
            class="w-full px-4 py-4 flex items-center justify-between hover:bg-white/5 transition-colors">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                <svg class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                </svg>
              </div>
              <span class="font-medium">Profil bearbeiten</span>
            </div>
            <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
          </button>
          
          <div class="h-px bg-white/5"></div>
          
          <button 
            (click)="logout()"
            class="w-full px-4 py-4 flex items-center justify-between hover:bg-white/5 transition-colors">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center">
                <svg class="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                </svg>
              </div>
              <span class="font-medium text-red-400">Abmelden</span>
            </div>
          </button>
        </div>
      </section>

      <!-- App Info -->
      <section class="px-5 mt-8 mb-8 text-center">
        <p class="text-xs text-gray-500">
          Jamie App v1.0.0<br>
          Made with ❤️ in Wien
        </p>
      </section>

      <!-- Edit Profile Modal -->
      @if (isEditModalOpen()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-black/80 backdrop-blur-sm" (click)="closeEditModal()"></div>
          
          <div class="relative bg-[#2e2e42] w-full max-w-md rounded-2xl overflow-hidden shadow-2xl border border-white/10 animate-zoom-in">
            <div class="flex justify-between items-center p-5 border-b border-white/5">
              <h2 class="text-lg font-bold">Profil bearbeiten</h2>
              <button (click)="closeEditModal()" class="p-2 hover:bg-white/5 rounded-full transition-colors">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
            
            <form (ngSubmit)="saveProfile()" class="p-5 space-y-4">
              <div class="space-y-2">
                <label class="text-xs text-gray-400 uppercase font-bold">Username</label>
                <input 
                  type="text" 
                  [(ngModel)]="editForm.username"
                  name="username"
                  class="input-jamie"
                  minlength="3"
                  maxlength="20">
              </div>
              
              <div class="space-y-2">
                <label class="text-xs text-gray-400 uppercase font-bold">Bio</label>
                <textarea 
                  [(ngModel)]="editForm.bio"
                  name="bio"
                  rows="3"
                  maxlength="200"
                  placeholder="Erzähl etwas über dich..."
                  class="input-jamie resize-none"></textarea>
              </div>
              
              <div class="space-y-2">
                <label class="text-xs text-gray-400 uppercase font-bold">Stadt</label>
                <select 
                  [(ngModel)]="editForm.city"
                  name="city"
                  class="input-jamie">
                  <option value="">Stadt wählen...</option>
                  @for (city of cities; track city) {
                    <option [value]="city">{{ city }}</option>
                  }
                </select>
              </div>
              
              <button 
                type="submit"
                [disabled]="isSaving()"
                class="w-full btn-jamie btn-primary py-3 mt-4">
                @if (isSaving()) {
                  <span class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                } @else {
                  Speichern
                }
              </button>
            </form>
          </div>
        </div>
      }
    </div>
  `
})
export class ProfileComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly backend = inject(BackendService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  // State
  activeTab = signal<ProfileTab>('created');
  isEditModalOpen = signal(false);
  isLoading = signal(false);
  isSaving = signal(false);
  
  createdGroups = signal<ActivityGroup[]>([]);
  joinedGroups = signal<ActivityGroup[]>([]);
  pendingGroups = signal<ActivityGroup[]>([]);

  // Edit form
  editForm = {
    username: '',
    bio: '',
    city: ''
  };

  cities = CITIES;

  // Computed
  readonly username = computed(() => this.auth.currentUser()?.username || 'User');
  readonly userAvatar = computed(() => this.auth.userAvatar());
  readonly userCity = computed(() => this.auth.currentUser()?.city);
  readonly userBio = computed(() => this.auth.currentUser()?.bio);
  
  readonly stats = computed(() => ({
    created: this.createdGroups().length,
    joined: this.joinedGroups().length,
    pending: this.pendingGroups().length
  }));

  readonly currentGroups = computed(() => {
    switch (this.activeTab()) {
      case 'created': return this.createdGroups();
      case 'joined': return this.joinedGroups();
      case 'pending': return this.pendingGroups();
    }
  });

  ngOnInit(): void {
    this.loadUserGroups();
    this.initEditForm();
  }

  private loadUserGroups(): void {
    this.isLoading.set(true);
    
    // TODO: Replace with actual API call
    // For now using mock data from backend service
    this.backend.getGroupById('').subscribe({
      error: () => {
        // Expected error, just for demo
        this.isLoading.set(false);
      }
    });

    // Simulate loading
    setTimeout(() => {
      this.isLoading.set(false);
    }, 500);
  }

  private initEditForm(): void {
    const user = this.auth.currentUser();
    if (user) {
      this.editForm = {
        username: user.username || '',
        bio: user.bio || '',
        city: user.city || ''
      };
    }
  }

  getCategoryColor(category: string): string {
    return CATEGORY_META[category as keyof typeof CATEGORY_META]?.color || '#ff7043';
  }

  getCategoryIcon(category: string): string {
    return CATEGORY_META[category as keyof typeof CATEGORY_META]?.icon || '✨';
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${day}.${month}.`;
  }

  openEditModal(): void {
    this.initEditForm();
    this.isEditModalOpen.set(true);
  }

  closeEditModal(): void {
    this.isEditModalOpen.set(false);
  }

  saveProfile(): void {
    if (this.isSaving()) return;
    
    this.isSaving.set(true);
    
    this.auth.updateProfile({
      username: this.editForm.username,
      bio: this.editForm.bio || undefined,
      city: this.editForm.city || undefined
    }).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.closeEditModal();
        this.toast.success('Profil aktualisiert!');
      },
      error: (err) => {
        this.isSaving.set(false);
        this.toast.error(err.message || 'Fehler beim Speichern');
      }
    });
  }

  editGroup(group: ActivityGroup): void {
    // TODO: Navigate to edit page or open modal
    this.toast.info('Bearbeiten kommt bald!');
  }

  deleteGroup(group: ActivityGroup): void {
    if (confirm(`"${group.title}" wirklich löschen?`)) {
      this.backend.deleteGroup(group.id).subscribe({
        next: () => {
          this.createdGroups.update(groups => groups.filter(g => g.id !== group.id));
          this.toast.success('Gruppe gelöscht');
        },
        error: () => {
          this.toast.error('Konnte Gruppe nicht löschen');
        }
      });
    }
  }

  leaveGroup(group: ActivityGroup): void {
    if (confirm(`"${group.title}" wirklich verlassen?`)) {
      this.backend.leaveGroup(group.id).subscribe({
        next: () => {
          this.joinedGroups.update(groups => groups.filter(g => g.id !== group.id));
          this.toast.success('Gruppe verlassen');
        },
        error: () => {
          this.toast.error('Konnte Gruppe nicht verlassen');
        }
      });
    }
  }

  logout(): void {
    if (confirm('Wirklich abmelden?')) {
      this.auth.logout();
      this.toast.info('Bis bald! 👋');
    }
  }
}