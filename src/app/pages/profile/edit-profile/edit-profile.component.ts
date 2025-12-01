// src/app/pages/profile/edit-profile/edit-profile.component.ts
import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';
import { CITIES, CATEGORY_META } from '../../../models/types';

interface ProfileData {
  username: string;
  email: string;
  bio: string;
  city: string;
  gender: string;
  birthDate: string;
  avatarUrl: string;
  photos: string[];
  interests: string[];
  spotifyUrl: string;
  pinterestUrl: string;
  instagramUrl: string;
}

@Component({
  selector: 'app-edit-profile',
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
      <header class="fixed top-0 left-0 right-0 px-5 pt-12 pb-4 bg-[#1c1c2e]/95 backdrop-blur-xl z-20 border-b border-white/5">
        <div class="flex items-center justify-between">
          <button 
            (click)="cancel()"
            class="text-gray-400 hover:text-white transition-colors">
            Abbrechen
          </button>
          <h1 class="text-lg font-bold text-white">Profil bearbeiten</h1>
          <button 
            (click)="save()"
            [disabled]="isSaving() || !hasChanges()"
            class="text-[#FD7666] font-bold disabled:opacity-50">
            @if (isSaving()) {
              <div class="w-5 h-5 border-2 border-[#FD7666]/30 border-t-[#FD7666] rounded-full animate-spin"></div>
            } @else {
              Speichern
            }
          </button>
        </div>
      </header>

      <!-- Content -->
      <div class="px-5 pt-28 relative z-10">
        
        <!-- Avatar Section -->
        <section class="mb-8">
          <div class="flex flex-col items-center">
            <!-- Main Avatar -->
            <div class="relative mb-4">
              <div class="w-28 h-28 rounded-full overflow-hidden bg-[#2e2e42] border-4 border-[#FD7666]/30">
                @if (profileData.avatarUrl) {
                  <img [src]="profileData.avatarUrl" class="w-full h-full object-cover">
                } @else {
                  <div class="w-full h-full flex items-center justify-center text-4xl text-[#FD7666] font-bold">
                    {{ profileData.username?.charAt(0)?.toUpperCase() || '?' }}
                  </div>
                }
              </div>
              <label class="absolute bottom-0 right-0 w-10 h-10 bg-[#FD7666] rounded-full flex items-center justify-center cursor-pointer shadow-lg">
                <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
                <input type="file" accept="image/*" (change)="onAvatarSelect($event)" class="hidden">
              </label>
            </div>
            <p class="text-sm text-gray-500">Tippe um Foto zu ändern</p>
          </div>
        </section>

        <!-- Photo Gallery -->
        <section class="mb-8">
          <h3 class="text-sm text-gray-400 uppercase font-bold tracking-wider mb-3">Galerie</h3>
          <div class="grid grid-cols-3 gap-2">
            @for (i of [0,1,2,3,4,5]; track i) {
              <div class="aspect-square rounded-xl overflow-hidden border-2 border-dashed transition-all"
                   [class]="profileData.photos[i] ? 'border-transparent' : 'border-white/20'">
                @if (profileData.photos[i]) {
                  <div class="relative w-full h-full group">
                    <img [src]="profileData.photos[i]" class="w-full h-full object-cover">
                    <button 
                      (click)="removePhoto(i)"
                      class="absolute top-1 right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                      </svg>
                    </button>
                  </div>
                } @else {
                  <label class="w-full h-full bg-[#2e2e42] flex items-center justify-center cursor-pointer hover:bg-[#3e3e52] transition-colors">
                    <svg class="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                    </svg>
                    <input type="file" accept="image/*" (change)="onPhotoSelect($event, i)" class="hidden">
                  </label>
                }
              </div>
            }
          </div>
        </section>

        <!-- Basic Info -->
        <section class="mb-8 space-y-4">
          <h3 class="text-sm text-gray-400 uppercase font-bold tracking-wider">Basis Info</h3>
          
          <!-- Username -->
          <div class="space-y-1.5">
            <label class="text-xs text-gray-500">Username</label>
            <input 
              type="text" 
              [(ngModel)]="profileData.username"
              class="w-full bg-[#2e2e42] text-white rounded-xl px-4 py-3.5 border border-white/10 focus:border-[#FD7666] focus:outline-none transition-colors">
          </div>

          <!-- Bio -->
          <div class="space-y-1.5">
            <div class="flex justify-between">
              <label class="text-xs text-gray-500">Bio</label>
              <span class="text-xs text-gray-600">{{ profileData.bio?.length || 0 }}/200</span>
            </div>
            <textarea 
              [(ngModel)]="profileData.bio"
              maxlength="200"
              rows="3"
              placeholder="Erzähl etwas über dich..."
              class="w-full bg-[#2e2e42] text-white rounded-xl px-4 py-3 border border-white/10 focus:border-[#FD7666] focus:outline-none transition-colors resize-none placeholder-gray-600">
            </textarea>
          </div>

          <!-- City -->
          <div class="space-y-1.5">
            <label class="text-xs text-gray-500">Stadt</label>
            <select 
              [(ngModel)]="profileData.city"
              class="w-full bg-[#2e2e42] text-white rounded-xl px-4 py-3.5 border border-white/10 focus:border-[#FD7666] focus:outline-none transition-colors appearance-none">
              <option value="" disabled>Stadt auswählen</option>
              @for (city of cities; track city) {
                <option [value]="city">{{ city }}</option>
              }
            </select>
          </div>

          <!-- Gender -->
          <div class="space-y-1.5">
            <label class="text-xs text-gray-500">Geschlecht</label>
            <div class="grid grid-cols-3 gap-2">
              @for (option of genderOptions; track option.value) {
                <button 
                  (click)="profileData.gender = option.value"
                  class="p-3 rounded-xl border-2 transition-all text-center"
                  [class]="profileData.gender === option.value 
                    ? 'bg-[#FD7666]/20 border-[#FD7666] text-white' 
                    : 'bg-[#2e2e42] border-transparent text-gray-400'">
                  <span class="text-lg">{{ option.icon }}</span>
                  <p class="text-xs mt-1">{{ option.label }}</p>
                </button>
              }
            </div>
          </div>

          <!-- Birth Date -->
          <div class="space-y-1.5">
            <label class="text-xs text-gray-500">Geburtstag</label>
            <input 
              type="date" 
              [(ngModel)]="profileData.birthDate"
              class="w-full bg-[#2e2e42] text-white rounded-xl px-4 py-3.5 border border-white/10 focus:border-[#FD7666] focus:outline-none transition-colors">
          </div>
        </section>

        <!-- Interests -->
        <section class="mb-8">
          <div class="flex justify-between items-center mb-3">
            <h3 class="text-sm text-gray-400 uppercase font-bold tracking-wider">Interessen</h3>
            <span class="text-xs text-gray-600">{{ profileData.interests?.length || 0 }}/{{ interests.length }}</span>
          </div>
          <div class="flex flex-wrap gap-2">
            @for (interest of interests; track interest.id) {
              <button 
                (click)="toggleInterest(interest.id)"
                class="px-4 py-2.5 rounded-xl border-2 transition-all flex items-center gap-2"
                [class]="isInterestSelected(interest.id) 
                  ? 'bg-[#FD7666]/20 border-[#FD7666] text-white' 
                  : 'bg-[#2e2e42] border-transparent text-gray-400 hover:border-white/20'">
                <span>{{ interest.icon }}</span>
                <span class="text-sm font-medium">{{ interest.name }}</span>
              </button>
            }
          </div>
        </section>

        <!-- Social Links -->
        <section class="mb-8 space-y-4">
          <h3 class="text-sm text-gray-400 uppercase font-bold tracking-wider">Social Media</h3>
          
          <!-- Spotify -->
          <div class="space-y-1.5">
            <label class="text-xs text-gray-500 flex items-center gap-2">
              <svg class="w-4 h-4 text-green-500" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
              </svg>
              Spotify
            </label>
            <input 
              type="url" 
              [(ngModel)]="profileData.spotifyUrl"
              placeholder="https://open.spotify.com/user/..."
              class="w-full bg-[#2e2e42] text-white rounded-xl px-4 py-3.5 border border-white/10 focus:border-[#FD7666] focus:outline-none transition-colors placeholder-gray-600">
          </div>

          <!-- Instagram -->
          <div class="space-y-1.5">
            <label class="text-xs text-gray-500 flex items-center gap-2">
              <svg class="w-4 h-4 text-pink-500" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
              Instagram
            </label>
            <input 
              type="text" 
              [(ngModel)]="profileData.instagramUrl"
              placeholder="@username"
              class="w-full bg-[#2e2e42] text-white rounded-xl px-4 py-3.5 border border-white/10 focus:border-[#FD7666] focus:outline-none transition-colors placeholder-gray-600">
          </div>

          <!-- Pinterest -->
          <div class="space-y-1.5">
            <label class="text-xs text-gray-500 flex items-center gap-2">
              <svg class="w-4 h-4 text-red-500" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.627 0-12 5.372-12 12 0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146 1.124.347 2.317.535 3.554.535 6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z"/>
              </svg>
              Pinterest
            </label>
            <input 
              type="url" 
              [(ngModel)]="profileData.pinterestUrl"
              placeholder="https://pinterest.com/..."
              class="w-full bg-[#2e2e42] text-white rounded-xl px-4 py-3.5 border border-white/10 focus:border-[#FD7666] focus:outline-none transition-colors placeholder-gray-600">
          </div>
        </section>

        <!-- Danger Zone -->
        <section class="mb-8">
          <h3 class="text-sm text-red-400 uppercase font-bold tracking-wider mb-3">Gefahrenzone</h3>
          <div class="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl space-y-3">
            <button 
              (click)="logout()"
              class="w-full p-3 bg-[#2e2e42] hover:bg-[#3e3e52] rounded-xl text-left flex items-center gap-3 transition-colors">
              <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
              </svg>
              <span class="text-white">Ausloggen</span>
            </button>
            <button 
              (click)="deleteAccount()"
              class="w-full p-3 bg-red-500/20 hover:bg-red-500/30 rounded-xl text-left flex items-center gap-3 transition-colors">
              <svg class="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
              <span class="text-red-400">Account löschen</span>
            </button>
          </div>
        </section>
      </div>
    </div>
  `
})
export class EditProfileComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  isSaving = signal(false);
  originalData: ProfileData | null = null;

  cities = CITIES;
  interests = Object.entries(CATEGORY_META).map(([id, meta]) => ({ id, ...meta }));
  
  genderOptions = [
    { value: 'MALE', label: 'Male', icon: '👨' },
    { value: 'FEMALE', label: 'Female', icon: '👩' },
    { value: 'DIVERSE', label: 'Diverse', icon: '🌈' }
  ];

  profileData: ProfileData = {
    username: '',
    email: '',
    bio: '',
    city: '',
    gender: '',
    birthDate: '',
    avatarUrl: '',
    photos: [],
    interests: [],
    spotifyUrl: '',
    pinterestUrl: '',
    instagramUrl: ''
  };

  ngOnInit(): void {
    this.loadProfile();
  }

  private loadProfile(): void {
    const user = this.auth.currentUser();
    if (user) {
      this.profileData = {
        username: user.username || '',
        email: user.email || '',
        bio: user.bio || '',
        city: user.city || '',
        gender: user.gender || '',
        birthDate: user.birthDate || '',
        avatarUrl: user.avatarUrl || '',
        photos: user.photos || [],
        interests: user.interests || [],
        spotifyUrl: user.spotifyUrl || '',
        pinterestUrl: user.pinterestUrl || '',
        instagramUrl: user.instagramUrl || ''
      };
      this.originalData = { ...this.profileData, photos: [...this.profileData.photos], interests: [...this.profileData.interests] };
    }
  }

  hasChanges(): boolean {
    if (!this.originalData) return false;
    return JSON.stringify(this.profileData) !== JSON.stringify(this.originalData);
  }

  toggleInterest(id: string): void {
    const idx = this.profileData.interests.indexOf(id);
    if (idx > -1) {
      this.profileData.interests.splice(idx, 1);
    } else {
      this.profileData.interests.push(id);
    }
  }

  isInterestSelected(id: string): boolean {
    return this.profileData.interests.includes(id);
  }

  onAvatarSelect(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.uploadImage(file).then(url => {
        this.profileData.avatarUrl = url;
      });
    }
  }

  onPhotoSelect(event: Event, index: number): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.uploadImage(file).then(url => {
        this.profileData.photos[index] = url;
      });
    }
  }

  removePhoto(index: number): void {
    this.profileData.photos.splice(index, 1);
  }

  private async uploadImage(file: File): Promise<string> {
    // For now, use base64 - in production, upload to server
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
  }

  save(): void {
    if (!this.hasChanges() || this.isSaving()) return;

    this.isSaving.set(true);

    this.http.put(`${environment.apiUrl}/users/profile`, this.profileData).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.toast.success('Profil gespeichert!');
        this.router.navigate(['/profile']);
      },
      error: (err) => {
        this.isSaving.set(false);
        this.toast.error(err.error?.error || 'Fehler beim Speichern');
      }
    });
  }

  cancel(): void {
    if (this.hasChanges()) {
      if (!confirm('Änderungen verwerfen?')) return;
    }
    this.router.navigate(['/profile']);
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/']);
  }

  deleteAccount(): void {
    if (!confirm('Account wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden!')) return;
    if (!confirm('Bist du dir sicher? Alle deine Daten werden gelöscht.')) return;

    this.http.delete(`${environment.apiUrl}/users/account`).subscribe({
      next: () => {
        this.auth.logout();
        this.toast.success('Account gelöscht');
        this.router.navigate(['/']);
      },
      error: (err) => {
        this.toast.error(err.error?.error || 'Fehler beim Löschen');
      }
    });
  }
}