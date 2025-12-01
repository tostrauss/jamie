// src/app/pages/onboarding/onboarding.component.ts
import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { CITIES, CATEGORY_META } from '../../models/types';

type OnboardingStep = 'gender' | 'location' | 'interests' | 'photos' | 'bio' | 'complete';

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-[#1c1c2e] flex flex-col relative overflow-hidden">
      
      <!-- Background -->
      <div class="absolute inset-0 pointer-events-none">
        <div class="absolute top-[-30%] left-[-30%] w-[600px] h-[600px] bg-purple-600/20 rounded-full blur-[150px]"></div>
        <div class="absolute bottom-[-30%] right-[-30%] w-[600px] h-[600px] bg-[#FD7666]/15 rounded-full blur-[150px]"></div>
      </div>

      <!-- Progress Bar -->
      <div class="px-6 pt-14 pb-2 relative z-10">
        <div class="flex justify-between items-center mb-4">
          <button 
            (click)="previousStep()"
            [class.invisible]="currentStepIndex() === 0"
            class="w-10 h-10 bg-[#2e2e42] rounded-xl flex items-center justify-center hover:bg-[#3e3e52] transition-colors">
            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
          <button 
            (click)="skip()"
            class="text-gray-500 text-sm hover:text-white transition-colors">
            Überspringen
          </button>
        </div>
        <!-- Progress Dots -->
        <div class="flex justify-center gap-2">
          @for (step of steps; track step; let i = $index) {
            <div 
              class="h-1.5 rounded-full transition-all duration-500"
              [class]="i <= currentStepIndex() ? 'w-8 bg-[#FD7666]' : 'w-1.5 bg-[#2e2e42]'">
            </div>
          }
        </div>
      </div>

      <!-- Content -->
      <div class="flex-1 px-6 py-8 relative z-10 overflow-y-auto">
        
        <!-- Step: Gender -->
        @if (currentStep() === 'gender') {
          <div class="animate-fade-in">
            <h1 class="text-3xl font-bold text-[#FD7666] mb-2">Select your Gender.</h1>
            <p class="text-gray-400 mb-8">Hilft uns passende Gruppen zu finden</p>

            <div class="space-y-3">
              @for (option of genderOptions; track option.value) {
                <button 
                  (click)="profileData.gender = option.value"
                  class="w-full p-4 rounded-2xl border-2 transition-all duration-300 text-left flex items-center gap-4"
                  [class]="profileData.gender === option.value 
                    ? 'bg-[#FD7666]/20 border-[#FD7666]' 
                    : 'bg-[#2e2e42] border-transparent hover:border-white/20'">
                  <span class="text-2xl">{{ option.icon }}</span>
                  <span class="font-medium text-white">{{ option.label }}</span>
                </button>
              }
            </div>
          </div>
        }

        <!-- Step: Location -->
        @if (currentStep() === 'location') {
          <div class="animate-fade-in">
            <h1 class="text-3xl font-bold text-[#FD7666] mb-2">Wo bist du?</h1>
            <p class="text-gray-400 mb-8">Finde Aktivitäten in deiner Nähe</p>

            <div class="grid grid-cols-2 gap-3">
              @for (city of cities; track city) {
                <button 
                  (click)="profileData.city = city"
                  class="p-4 rounded-2xl border-2 transition-all duration-300"
                  [class]="profileData.city === city 
                    ? 'bg-[#FD7666]/20 border-[#FD7666]' 
                    : 'bg-[#2e2e42] border-transparent hover:border-white/20'">
                  <span class="font-medium text-white">{{ city }}</span>
                </button>
              }
            </div>
          </div>
        }

        <!-- Step: Interests -->
        @if (currentStep() === 'interests') {
          <div class="animate-fade-in">
            <h1 class="text-3xl font-bold text-[#FD7666] mb-2">Deine Interessen</h1>
            <p class="text-gray-400 mb-2">Wähle mindestens 3 aus</p>
            <p class="text-sm text-[#FD7666] mb-6">{{ profileData.interests.length }}/{{ interests.length }} ausgewählt</p>

            <div class="flex flex-wrap gap-3">
              @for (interest of interests; track interest.id) {
                <button 
                  (click)="toggleInterest(interest.id)"
                  class="px-4 py-3 rounded-2xl border-2 transition-all duration-300 flex items-center gap-2"
                  [class]="isInterestSelected(interest.id) 
                    ? 'bg-[#FD7666]/20 border-[#FD7666]' 
                    : 'bg-[#2e2e42] border-transparent hover:border-white/20'">
                  <span class="text-xl">{{ interest.icon }}</span>
                  <span class="font-medium text-white">{{ interest.name }}</span>
                </button>
              }
            </div>
          </div>
        }

        <!-- Step: Photos -->
        @if (currentStep() === 'photos') {
          <div class="animate-fade-in">
            <h1 class="text-3xl font-bold text-[#FD7666] mb-2">Zeig dich!</h1>
            <p class="text-gray-400 mb-8">Lade bis zu 6 Fotos hoch</p>

            <div class="grid grid-cols-3 gap-3">
              @for (i of [0,1,2,3,4,5]; track i) {
                <div 
                  class="aspect-square rounded-2xl border-2 border-dashed transition-all duration-300 overflow-hidden"
                  [class]="profileData.photos[i] ? 'border-[#FD7666]' : 'border-white/20 hover:border-[#FD7666]/50'">
                  @if (profileData.photos[i]) {
                    <div class="relative w-full h-full">
                      <img [src]="profileData.photos[i]" class="w-full h-full object-cover">
                      <button 
                        (click)="removePhoto(i)"
                        class="absolute top-1 right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                        <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                      </button>
                    </div>
                  } @else {
                    <label class="w-full h-full flex flex-col items-center justify-center cursor-pointer text-gray-500 hover:text-[#FD7666]">
                      <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                      </svg>
                      <input type="file" accept="image/*" (change)="onPhotoSelect($event, i)" class="hidden">
                    </label>
                  }
                </div>
              }
            </div>
            <p class="text-sm text-gray-500 text-center mt-4">Das erste Foto wird dein Profilbild</p>
          </div>
        }

        <!-- Step: Bio -->
        @if (currentStep() === 'bio') {
          <div class="animate-fade-in">
            <h1 class="text-3xl font-bold text-[#FD7666] mb-2">Über dich</h1>
            <p class="text-gray-400 mb-8">Erzähl anderen etwas über dich</p>

            <div class="space-y-2">
              <div class="flex justify-between">
                <label class="text-xs text-gray-400 uppercase font-bold tracking-wider">Bio</label>
                <span class="text-xs text-gray-500">{{ profileData.bio.length }}/200</span>
              </div>
              <textarea 
                [(ngModel)]="profileData.bio"
                maxlength="200"
                rows="5"
                placeholder="Hey! Ich bin neu in der Stadt und suche Leute für..."
                class="w-full bg-[#2e2e42] text-white rounded-xl px-4 py-3 border border-white/10 focus:border-[#FD7666] focus:outline-none resize-none placeholder-gray-600">
              </textarea>
            </div>

            <div class="mt-6 space-y-3">
              <p class="text-sm text-gray-400">Beispiel-Ideen:</p>
              @for (suggestion of bioSuggestions; track suggestion) {
                <button 
                  (click)="profileData.bio = suggestion"
                  class="w-full p-3 bg-[#2e2e42] rounded-xl text-left text-sm text-gray-300 hover:bg-[#3e3e52] transition-colors">
                  "{{ suggestion }}"
                </button>
              }
            </div>
          </div>
        }

        <!-- Step: Complete -->
        @if (currentStep() === 'complete') {
          <div class="animate-fade-in text-center">
            <div class="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg class="w-12 h-12 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
            </div>
            <h1 class="text-3xl font-bold text-white mb-2">Perfekt!</h1>
            <p class="text-gray-400 mb-8">Dein Profil ist bereit. Lass uns loslegen!</p>
          </div>
        }
      </div>

      <!-- Bottom Action -->
      <div class="px-6 pb-8 pt-4 relative z-10">
        <button 
          (click)="nextStep()"
          [disabled]="!canProceed()"
          class="w-full py-4 bg-[#FD7666] hover:bg-[#ff5744] text-white font-bold rounded-2xl 
                 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed">
          {{ currentStep() === 'complete' ? 'Los geht\'s!' : 'Confirm' }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
  `]
})
export class OnboardingComponent {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  steps: OnboardingStep[] = ['gender', 'location', 'interests', 'photos', 'bio', 'complete'];
  currentStep = signal<OnboardingStep>('gender');

  cities = CITIES;
  interests = Object.entries(CATEGORY_META).map(([id, meta]) => ({ id, ...meta }));
  
  genderOptions = [
    { value: 'male', label: 'Male', icon: '👨' },
    { value: 'female', label: 'Female', icon: '👩' },
    { value: 'diverse', label: 'Diverse', icon: '🌈' }
  ];

  bioSuggestions = [
    'Neu in der Stadt und suche Anschluss!',
    'Sportbegeistert und immer für was Neues zu haben.',
    'Liebe gutes Essen und nette Gespräche.'
  ];

  profileData = {
    gender: '',
    city: '',
    interests: [] as string[],
    photos: [] as string[],
    bio: ''
  };

  currentStepIndex = computed(() => this.steps.indexOf(this.currentStep()));

  canProceed(): boolean {
    switch (this.currentStep()) {
      case 'gender': return !!this.profileData.gender;
      case 'location': return !!this.profileData.city;
      case 'interests': return this.profileData.interests.length >= 3;
      case 'photos': return this.profileData.photos.length >= 1;
      case 'bio': return true;
      case 'complete': return true;
      default: return false;
    }
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

  onPhotoSelect(event: Event, index: number): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        this.profileData.photos[index] = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  removePhoto(index: number): void {
    this.profileData.photos.splice(index, 1);
  }

  previousStep(): void {
    const idx = this.currentStepIndex();
    if (idx > 0) {
      this.currentStep.set(this.steps[idx - 1]);
    }
  }

  nextStep(): void {
    const idx = this.currentStepIndex();
    if (idx < this.steps.length - 1) {
      this.currentStep.set(this.steps[idx + 1]);
    } else {
      this.complete();
    }
  }

  skip(): void {
    this.router.navigate(['/home']);
  }

  private complete(): void {
    // TODO: Save profile data to backend
    this.toast.success('Profil erstellt! 🎉');
    this.router.navigate(['/home']);
  }
}