// src/app/shared/components/modal/create-modal/create-modal.component.ts
import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BackendService } from '../../../../services/backend.service';
import { ToastService } from '../../../../services/toast.service';
import { ActivityCategory, CATEGORY_META, CITIES, CreateGroupRequest } from '../../../../models/types';

@Component({
  selector: 'app-create-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <!-- Backdrop -->
      <div 
        class="absolute inset-0 bg-black/80 backdrop-blur-sm animate-fade-in" 
        (click)="closeModal()">
      </div>
      
      <!-- Modal -->
      <div class="relative bg-[#2e2e42] w-full max-w-md rounded-t-[28px] sm:rounded-[28px] overflow-hidden shadow-2xl border border-white/10 animate-slide-up max-h-[90vh] overflow-y-auto">
        
        <!-- Header -->
        <div class="sticky top-0 z-10 flex justify-between items-center p-5 border-b border-white/5 bg-[#2e2e42]/95 backdrop-blur-sm">
          <div>
            <h2 class="text-xl font-bold text-white">Neue Aktivität</h2>
            <p class="text-xs text-gray-400 mt-0.5">Lade andere ein mitzumachen</p>
          </div>
          <button 
            (click)="closeModal()" 
            class="bg-white/5 hover:bg-white/10 p-2 rounded-full text-white transition-colors"
            aria-label="Schließen">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
    
        <!-- Form -->
        <form (ngSubmit)="submit()" class="p-5 space-y-5">
          
          <!-- Title -->
          <div class="space-y-2">
            <label class="text-xs text-gray-400 uppercase font-bold tracking-wider">
              Titel <span class="text-[#ff7043]">*</span>
            </label>
            <input 
              type="text" 
              [(ngModel)]="formData.title" 
              name="title"
              placeholder="z.B. Beachvolleyball am Donaukanal"
              required
              minlength="5"
              maxlength="60"
              class="input-jamie">
            <div class="flex justify-between text-[10px]">
              <span class="text-gray-500">Min. 5 Zeichen</span>
              <span [class.text-[#ff7043]]="formData.title.length > 50" class="text-gray-500">
                {{ formData.title.length }}/60
              </span>
            </div>
          </div>

          <!-- Category -->
          <div class="space-y-2">
            <label class="text-xs text-gray-400 uppercase font-bold tracking-wider">
              Kategorie <span class="text-[#ff7043]">*</span>
            </label>
            <div class="grid grid-cols-3 gap-2">
              @for (cat of categoryList; track cat.id) {
                <button 
                  type="button"
                  (click)="formData.category = cat.id"
                  class="p-3 rounded-xl text-center transition-all border"
                  [class.bg-[#ff7043]/20]="formData.category === cat.id"
                  [class.border-[#ff7043]]="formData.category === cat.id"
                  [class.text-white]="formData.category === cat.id"
                  [class.bg-[#1c1c2e]]="formData.category !== cat.id"
                  [class.border-white/5]="formData.category !== cat.id"
                  [class.text-gray-400]="formData.category !== cat.id">
                  <span class="text-lg block mb-1">{{ cat.icon }}</span>
                  <span class="text-[10px] font-medium">{{ cat.name }}</span>
                </button>
              }
            </div>
          </div>

          <!-- City -->
          <div class="space-y-2">
            <label class="text-xs text-gray-400 uppercase font-bold tracking-wider">
              Stadt <span class="text-[#ff7043]">*</span>
            </label>
            <div class="relative">
              <select 
                [(ngModel)]="formData.city"
                name="city"
                required
                class="input-jamie appearance-none cursor-pointer pr-10">
                @for (city of cities; track city) {
                  <option [value]="city">{{ city }}</option>
                }
              </select>
              <svg class="w-5 h-5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
              </svg>
            </div>
          </div>

          <!-- Location & Date -->
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-2">
              <label class="text-xs text-gray-400 uppercase font-bold tracking-wider">
                Treffpunkt <span class="text-[#ff7043]">*</span>
              </label>
              <input 
                type="text" 
                [(ngModel)]="formData.location"
                name="location" 
                placeholder="z.B. Donaukanal"
                required
                class="input-jamie">
            </div>
            
            <div class="space-y-2">
              <label class="text-xs text-gray-400 uppercase font-bold tracking-wider">
                Wann? <span class="text-[#ff7043]">*</span>
              </label>
              <input 
                type="datetime-local" 
                [(ngModel)]="formData.date"
                name="date"
                [min]="minDate"
                required
                class="input-jamie">
            </div>
          </div>

          <!-- Max Members -->
          <div class="space-y-2">
            <label class="text-xs text-gray-400 uppercase font-bold tracking-wider">
              Max. Teilnehmer
            </label>
            <div class="flex items-center gap-4">
              <button 
                type="button"
                (click)="decrementMembers()"
                [disabled]="formData.maxMembers <= 2"
                class="w-10 h-10 rounded-full bg-[#1c1c2e] border border-white/10 flex items-center justify-center text-white hover:bg-white/5 disabled:opacity-30 transition-colors">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"/>
                </svg>
              </button>
              <div class="flex-1 text-center">
                <span class="text-2xl font-bold text-white">{{ formData.maxMembers }}</span>
                <span class="text-sm text-gray-400 ml-1">Personen</span>
              </div>
              <button 
                type="button"
                (click)="incrementMembers()"
                [disabled]="formData.maxMembers >= 50"
                class="w-10 h-10 rounded-full bg-[#1c1c2e] border border-white/10 flex items-center justify-center text-white hover:bg-white/5 disabled:opacity-30 transition-colors">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                </svg>
              </button>
            </div>
          </div>

          <!-- Description -->
          <div class="space-y-2">
            <label class="text-xs text-gray-400 uppercase font-bold tracking-wider">
              Beschreibung
            </label>
            <textarea 
              [(ngModel)]="formData.description"
              name="description" 
              rows="3" 
              placeholder="Worum geht's? Was sollen die Teilnehmer mitbringen?"
              maxlength="500"
              class="input-jamie resize-none"></textarea>
            <div class="text-right text-[10px] text-gray-500">
              {{ formData.description.length }}/500
            </div>
          </div>
    
          <!-- Submit -->
          <button 
            type="submit" 
            [disabled]="!isValid() || creating()"
            class="w-full btn-jamie btn-primary py-4 mt-2">
            @if (creating()) {
              <span class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            } @else {
              <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
              </svg>
              Aktivität erstellen
            }
          </button>
        </form>
      </div>
    </div>
  `
})
export class CreateModalComponent {
  @Output() close = new EventEmitter<void>();
  @Output() created = new EventEmitter<void>();
  
  private readonly backend = inject(BackendService);
  private readonly toast = inject(ToastService);
  
  creating = signal(false);
  
  cities = CITIES;
  categoryList = Object.entries(CATEGORY_META).map(([id, meta]) => ({
    id: id as ActivityCategory,
    ...meta
  }));

  formData = {
    title: '',
    category: 'SOCIAL' as ActivityCategory,
    city: this.backend.selectedCity(),
    location: '',
    date: '',
    description: '',
    maxMembers: 10
  };

  get minDate(): string {
    return new Date().toISOString().slice(0, 16);
  }

  isValid(): boolean {
    return (
      this.formData.title.length >= 5 &&
      this.formData.location.length > 0 &&
      this.formData.date.length > 0 &&
      this.formData.city.length > 0
    );
  }

  incrementMembers(): void {
    if (this.formData.maxMembers < 50) this.formData.maxMembers++;
  }

  decrementMembers(): void {
    if (this.formData.maxMembers > 2) this.formData.maxMembers--;
  }

  submit(): void {
    if (!this.isValid() || this.creating()) return;

    this.creating.set(true);
    
    const request: CreateGroupRequest = {
      title: this.formData.title.trim(),
      description: this.formData.description.trim(),
      category: this.formData.category,
      city: this.formData.city,
      location: this.formData.location.trim(),
      date: new Date(this.formData.date).toISOString(),
      maxMembers: this.formData.maxMembers
    };

    this.backend.createGroup(request).subscribe({
      next: (group) => {
        this.creating.set(false);
        this.toast.success(`"${group.title}" wurde erstellt!`);
        this.created.emit();
      },
      error: (err) => {
        this.creating.set(false);
        this.toast.showApiError(err, 'Aktivität konnte nicht erstellt werden');
      }
    });
  }

  closeModal(): void {
    this.close.emit();
  }
}