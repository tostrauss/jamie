// src/app/shared/components/create-modal/create-modal.component.ts
import { Component, inject, signal, computed, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { ToastService } from '../../../../services/toast.service';
import { CITIES, CATEGORY_META } from '../../../../models/types';

type CreateType = 'group' | 'club';
type CreateStep = 'type' | 'basic' | 'details' | 'image' | 'review';

interface GroupData {
  title: string;
  description: string;
  category: string;
  city: string;
  location: string;
  date: string;
  time: string;
  maxMembers: number;
  imageUrl: string;
}

interface ClubData {
  title: string;
  description: string;
  category: string;
  city: string;
  location: string;
  isPrivate: boolean;
  imageUrl: string;
}

@Component({
  selector: 'app-create-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- Backdrop -->
    <div 
      class="fixed inset-0 z-50 flex items-end justify-center"
      (click)="onBackdropClick($event)">
      
      <!-- Dark Overlay -->
      <div class="absolute inset-0 bg-black/80 backdrop-blur-sm animate-fade-in"></div>
      
      <!-- Modal -->
      <div 
        class="relative bg-[#1c1c2e] rounded-t-3xl w-full max-h-[90vh] overflow-hidden animate-slide-up border-t border-white/10"
        (click)="$event.stopPropagation()">
        
        <!-- Handle -->
        <div class="flex justify-center py-3">
          <div class="w-10 h-1 bg-gray-600 rounded-full"></div>
        </div>
        
        <!-- Header -->
        <div class="px-5 pb-4 flex items-center justify-between border-b border-white/5">
          <div class="flex items-center gap-3">
            @if (currentStep() !== 'type') {
              <button 
                (click)="previousStep()"
                class="w-8 h-8 bg-[#2e2e42] rounded-lg flex items-center justify-center hover:bg-[#3e3e52] transition-colors">
                <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                </svg>
              </button>
            }
            <h2 class="text-xl font-bold text-white">
              {{ getStepTitle() }}
            </h2>
          </div>
          <button 
            (click)="close()"
            class="w-8 h-8 hover:bg-[#2e2e42] rounded-lg flex items-center justify-center transition-colors">
            <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <!-- Progress -->
        @if (currentStep() !== 'type') {
          <div class="px-5 py-3 flex gap-1.5">
            @for (step of getSteps(); track step; let i = $index) {
              <div 
                class="h-1 flex-1 rounded-full transition-all duration-300"
                [class]="i <= currentStepIndex() ? 'bg-[#FD7666]' : 'bg-[#2e2e42]'">
              </div>
            }
          </div>
        }

        <!-- Content -->
        <div class="px-5 py-4 overflow-y-auto max-h-[60vh]">
          
          <!-- Step: Choose Type -->
          @if (currentStep() === 'type') {
            <div class="space-y-4 animate-fade-in">
              <p class="text-gray-400 text-sm mb-6">Was möchtest du erstellen?</p>
              
              <!-- Group Option -->
              <button 
                (click)="selectType('group')"
                class="w-full p-5 bg-[#2e2e42] hover:bg-[#3e3e52] rounded-2xl border-2 border-transparent hover:border-[#FD7666]/30 transition-all text-left group">
                <div class="flex items-start gap-4">
                  <div class="w-14 h-14 bg-[#FD7666]/20 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-[#FD7666]/30 transition-colors">
                    <svg class="w-7 h-7 text-[#FD7666]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                    </svg>
                  </div>
                  <div class="flex-1">
                    <h3 class="font-bold text-white text-lg mb-1">Gruppe</h3>
                    <p class="text-gray-400 text-sm">Einmalige Aktivität mit 3-10 Leuten. Perfekt für spontane Treffen.</p>
                    <div class="flex flex-wrap gap-2 mt-3">
                      <span class="px-2 py-1 bg-[#3e3e52] rounded-lg text-xs text-gray-300">3-10 Personen</span>
                      <span class="px-2 py-1 bg-[#3e3e52] rounded-lg text-xs text-gray-300">Einmalig</span>
                      <span class="px-2 py-1 bg-[#3e3e52] rounded-lg text-xs text-gray-300">Mit Datum</span>
                    </div>
                  </div>
                  <svg class="w-5 h-5 text-gray-500 group-hover:text-[#FD7666] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                  </svg>
                </div>
              </button>

              <!-- Club Option -->
              <button 
                (click)="selectType('club')"
                class="w-full p-5 bg-[#2e2e42] hover:bg-[#3e3e52] rounded-2xl border-2 border-transparent hover:border-purple-500/30 transition-all text-left group">
                <div class="flex items-start gap-4">
                  <div class="w-14 h-14 bg-purple-500/20 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-purple-500/30 transition-colors">
                    <svg class="w-7 h-7 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                    </svg>
                  </div>
                  <div class="flex-1">
                    <h3 class="font-bold text-white text-lg mb-1">Club</h3>
                    <p class="text-gray-400 text-sm">Langfristige Community für regelmäßige Aktivitäten. Unbegrenzte Mitglieder.</p>
                    <div class="flex flex-wrap gap-2 mt-3">
                      <span class="px-2 py-1 bg-[#3e3e52] rounded-lg text-xs text-gray-300">Unbegrenzt</span>
                      <span class="px-2 py-1 bg-[#3e3e52] rounded-lg text-xs text-gray-300">Permanent</span>
                      <span class="px-2 py-1 bg-[#3e3e52] rounded-lg text-xs text-gray-300">Öffentlich/Privat</span>
                    </div>
                  </div>
                  <svg class="w-5 h-5 text-gray-500 group-hover:text-purple-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                  </svg>
                </div>
              </button>
            </div>
          }

          <!-- Step: Basic Info -->
          @if (currentStep() === 'basic') {
            <div class="space-y-5 animate-fade-in">
              <!-- Title -->
              <div class="space-y-2">
                <label class="text-xs text-gray-400 uppercase font-bold tracking-wider">
                  {{ createType() === 'group' ? 'Aktivität' : 'Club Name' }} *
                </label>
                <input 
                  type="text" 
                  [(ngModel)]="createType() === 'group' ? groupData.title : clubData.title"
                  [placeholder]="createType() === 'group' ? 'z.B. Volleyball am Strand' : 'z.B. Tennis Club München'"
                  maxlength="60"
                  class="w-full bg-[#2e2e42] text-white rounded-xl px-4 py-3.5 border border-white/10 focus:border-[#FD7666] focus:outline-none transition-colors placeholder-gray-600">
                <p class="text-xs text-gray-600 text-right">{{ (createType() === 'group' ? groupData.title : clubData.title).length }}/60</p>
              </div>

              <!-- Category -->
              <div class="space-y-2">
                <label class="text-xs text-gray-400 uppercase font-bold tracking-wider">Kategorie *</label>
                <div class="grid grid-cols-3 gap-2">
                  @for (cat of categories; track cat.id) {
                    <button 
                      (click)="setCategory(cat.id)"
                      class="p-3 rounded-xl border-2 transition-all text-center"
                      [class]="getCategory() === cat.id 
                        ? 'bg-[#FD7666]/20 border-[#FD7666]' 
                        : 'bg-[#2e2e42] border-transparent hover:border-white/20'">
                      <span class="text-xl block mb-1">{{ cat.icon }}</span>
                      <span class="text-xs text-gray-300">{{ cat.name }}</span>
                    </button>
                  }
                </div>
              </div>

              <!-- City -->
              <div class="space-y-2">
                <label class="text-xs text-gray-400 uppercase font-bold tracking-wider">Stadt *</label>
                <select 
                  [(ngModel)]="createType() === 'group' ? groupData.city : clubData.city"
                  class="w-full bg-[#2e2e42] text-white rounded-xl px-4 py-3.5 border border-white/10 focus:border-[#FD7666] focus:outline-none transition-colors appearance-none">
                  <option value="" disabled>Stadt auswählen</option>
                  @for (city of cities; track city) {
                    <option [value]="city">{{ city }}</option>
                  }
                </select>
              </div>
            </div>
          }

          <!-- Step: Details -->
          @if (currentStep() === 'details') {
            <div class="space-y-5 animate-fade-in">
              <!-- Description -->
              <div class="space-y-2">
                <label class="text-xs text-gray-400 uppercase font-bold tracking-wider">Beschreibung</label>
                <textarea 
                  [(ngModel)]="createType() === 'group' ? groupData.description : clubData.description"
                  rows="4"
                  maxlength="500"
                  placeholder="Erzähle mehr über die Aktivität..."
                  class="w-full bg-[#2e2e42] text-white rounded-xl px-4 py-3 border border-white/10 focus:border-[#FD7666] focus:outline-none transition-colors resize-none placeholder-gray-600">
                </textarea>
                <p class="text-xs text-gray-600 text-right">{{ (createType() === 'group' ? groupData.description : clubData.description).length }}/500</p>
              </div>

              <!-- Location -->
              <div class="space-y-2">
                <label class="text-xs text-gray-400 uppercase font-bold tracking-wider">Treffpunkt / Adresse</label>
                <div class="relative">
                  <svg class="w-5 h-5 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                  </svg>
                  <input 
                    type="text" 
                    [(ngModel)]="createType() === 'group' ? groupData.location : clubData.location"
                    placeholder="z.B. Englischer Garten, Haupteingang"
                    class="w-full bg-[#2e2e42] text-white rounded-xl pl-12 pr-4 py-3.5 border border-white/10 focus:border-[#FD7666] focus:outline-none transition-colors placeholder-gray-600">
                </div>
              </div>

              <!-- Group-specific fields -->
              @if (createType() === 'group') {
                <!-- Date & Time -->
                <div class="grid grid-cols-2 gap-3">
                  <div class="space-y-2">
                    <label class="text-xs text-gray-400 uppercase font-bold tracking-wider">Datum *</label>
                    <input 
                      type="date" 
                      [(ngModel)]="groupData.date"
                      [min]="minDate"
                      class="w-full bg-[#2e2e42] text-white rounded-xl px-4 py-3.5 border border-white/10 focus:border-[#FD7666] focus:outline-none transition-colors">
                  </div>
                  <div class="space-y-2">
                    <label class="text-xs text-gray-400 uppercase font-bold tracking-wider">Uhrzeit *</label>
                    <input 
                      type="time" 
                      [(ngModel)]="groupData.time"
                      class="w-full bg-[#2e2e42] text-white rounded-xl px-4 py-3.5 border border-white/10 focus:border-[#FD7666] focus:outline-none transition-colors">
                  </div>
                </div>

                <!-- Max Members -->
                <div class="space-y-2">
                  <label class="text-xs text-gray-400 uppercase font-bold tracking-wider">Max. Teilnehmer (3-10) *</label>
                  <div class="flex items-center gap-4">
                    <button 
                      (click)="adjustMembers(-1)"
                      [disabled]="groupData.maxMembers <= 3"
                      class="w-12 h-12 bg-[#2e2e42] hover:bg-[#3e3e52] rounded-xl flex items-center justify-center transition-colors disabled:opacity-50">
                      <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"/>
                      </svg>
                    </button>
                    <div class="flex-1 text-center">
                      <span class="text-3xl font-bold text-[#FD7666]">{{ groupData.maxMembers }}</span>
                      <p class="text-xs text-gray-500">Personen</p>
                    </div>
                    <button 
                      (click)="adjustMembers(1)"
                      [disabled]="groupData.maxMembers >= 10"
                      class="w-12 h-12 bg-[#2e2e42] hover:bg-[#3e3e52] rounded-xl flex items-center justify-center transition-colors disabled:opacity-50">
                      <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                      </svg>
                    </button>
                  </div>
                </div>
              }

              <!-- Club-specific fields -->
              @if (createType() === 'club') {
                <!-- Privacy Setting -->
                <div class="space-y-2">
                  <label class="text-xs text-gray-400 uppercase font-bold tracking-wider">Sichtbarkeit</label>
                  <div class="grid grid-cols-2 gap-3">
                    <button 
                      (click)="clubData.isPrivate = false"
                      class="p-4 rounded-xl border-2 transition-all text-left"
                      [class]="!clubData.isPrivate 
                        ? 'bg-[#FD7666]/20 border-[#FD7666]' 
                        : 'bg-[#2e2e42] border-transparent'">
                      <div class="flex items-center gap-3">
                        <svg class="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        <div>
                          <p class="font-medium text-white">Öffentlich</p>
                          <p class="text-xs text-gray-500">Jeder kann beitreten</p>
                        </div>
                      </div>
                    </button>
                    <button 
                      (click)="clubData.isPrivate = true"
                      class="p-4 rounded-xl border-2 transition-all text-left"
                      [class]="clubData.isPrivate 
                        ? 'bg-[#FD7666]/20 border-[#FD7666]' 
                        : 'bg-[#2e2e42] border-transparent'">
                      <div class="flex items-center gap-3">
                        <svg class="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                        </svg>
                        <div>
                          <p class="font-medium text-white">Privat</p>
                          <p class="text-xs text-gray-500">Nur mit Einladung</p>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              }
            </div>
          }

          <!-- Step: Image -->
          @if (currentStep() === 'image') {
            <div class="space-y-5 animate-fade-in">
              <p class="text-gray-400 text-sm">Füge ein Bild hinzu um mehr Aufmerksamkeit zu bekommen.</p>
              
              <!-- Image Upload -->
              <div 
                class="aspect-video rounded-2xl border-2 border-dashed overflow-hidden transition-all"
                [class]="getImageUrl() ? 'border-[#FD7666]' : 'border-white/20 hover:border-[#FD7666]/50'">
                @if (getImageUrl()) {
                  <div class="relative w-full h-full">
                    <img [src]="getImageUrl()" class="w-full h-full object-cover">
                    <button 
                      (click)="removeImage()"
                      class="absolute top-3 right-3 w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center shadow-lg">
                      <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                      </svg>
                    </button>
                  </div>
                } @else {
                  <label class="w-full h-full bg-[#2e2e42] flex flex-col items-center justify-center cursor-pointer hover:bg-[#3e3e52] transition-colors">
                    <svg class="w-12 h-12 text-gray-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                    </svg>
                    <p class="text-gray-400 font-medium">Bild hochladen</p>
                    <p class="text-gray-600 text-sm mt-1">Max. 10MB (JPG, PNG)</p>
                    <input type="file" accept="image/*" (change)="onImageSelect($event)" class="hidden">
                  </label>
                }
              </div>

              <!-- Skip hint -->
              <p class="text-center text-gray-600 text-sm">
                Du kannst diesen Schritt überspringen und später ein Bild hinzufügen.
              </p>
            </div>
          }

          <!-- Step: Review -->
          @if (currentStep() === 'review') {
            <div class="space-y-5 animate-fade-in">
              <p class="text-gray-400 text-sm">Überprüfe deine Angaben bevor du {{ createType() === 'group' ? 'die Gruppe' : 'den Club' }} erstellst.</p>
              
              <!-- Preview Card -->
              <div class="bg-[#2e2e42] rounded-2xl overflow-hidden border border-white/5">
                <!-- Image -->
                <div class="aspect-video bg-[#3e3e52] overflow-hidden">
                  @if (getImageUrl()) {
                    <img [src]="getImageUrl()" class="w-full h-full object-cover">
                  } @else {
                    <div class="w-full h-full flex items-center justify-center">
                      <span class="text-4xl">{{ getCategoryIcon() }}</span>
                    </div>
                  }
                </div>
                
                <!-- Info -->
                <div class="p-4">
                  <div class="flex items-start justify-between mb-2">
                    <h3 class="font-bold text-white text-lg">{{ getTitle() }}</h3>
                    <span 
                      class="px-2 py-1 rounded-lg text-xs font-medium"
                      [style.background]="getCategoryColor() + '33'"
                      [style.color]="getCategoryColor()">
                      {{ getCategoryIcon() }} {{ getCategoryName() }}
                    </span>
                  </div>
                  
                  @if (getDescription()) {
                    <p class="text-gray-400 text-sm mb-3 line-clamp-2">{{ getDescription() }}</p>
                  }
                  
                  <div class="flex flex-wrap gap-2 text-xs text-gray-500">
                    <span class="flex items-center gap-1">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                      </svg>
                      {{ getCity() }}
                    </span>
                    
                    @if (createType() === 'group') {
                      <span class="flex items-center gap-1">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                        </svg>
                        {{ formatDate(groupData.date) }} {{ groupData.time }}
                      </span>
                      <span class="flex items-center gap-1">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
                        </svg>
                        Max. {{ groupData.maxMembers }} Personen
                      </span>
                    }
                    
                    @if (createType() === 'club') {
                      <span class="flex items-center gap-1">
                        @if (clubData.isPrivate) {
                          <svg class="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                          </svg>
                          Privat
                        } @else {
                          <svg class="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                          </svg>
                          Öffentlich
                        }
                      </span>
                    }
                  </div>
                </div>
              </div>
            </div>
          }
        </div>

        <!-- Footer -->
        <div class="px-5 py-4 border-t border-white/5">
          @if (currentStep() === 'type') {
            <button 
              (click)="close()"
              class="w-full py-3.5 bg-[#2e2e42] hover:bg-[#3e3e52] text-gray-400 font-medium rounded-xl transition-colors">
              Abbrechen
            </button>
          } @else if (currentStep() === 'review') {
            <button 
              (click)="submit()"
              [disabled]="isSubmitting()"
              class="w-full py-4 bg-[#FD7666] hover:bg-[#ff5744] text-white font-bold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              @if (isSubmitting()) {
                <div class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Wird erstellt...</span>
              } @else {
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
                <span>{{ createType() === 'group' ? 'Gruppe erstellen' : 'Club erstellen' }}</span>
              }
            </button>
          } @else {
            <button 
              (click)="nextStep()"
              [disabled]="!canProceed()"
              class="w-full py-4 bg-[#FD7666] hover:bg-[#ff5744] text-white font-bold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              <span>Weiter</span>
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
              </svg>
            </button>
          }
        </div>
      </div>
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
    .line-clamp-2 {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
  `]
})
export class CreateModalComponent {
  @Output() closeModal = new EventEmitter<void>();
  @Output() created = new EventEmitter<{ type: CreateType; id: string }>();

  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);

  // State
  createType = signal<CreateType | null>(null);
  currentStep = signal<CreateStep>('type');
  isSubmitting = signal(false);

  // Data
  cities = CITIES;
  categories = Object.entries(CATEGORY_META).map(([id, meta]) => ({ id, ...meta }));

  groupData: GroupData = {
    title: '',
    description: '',
    category: '',
    city: '',
    location: '',
    date: '',
    time: '',
    maxMembers: 5,
    imageUrl: ''
  };

  clubData: ClubData = {
    title: '',
    description: '',
    category: '',
    city: '',
    location: '',
    isPrivate: false,
    imageUrl: ''
  };

  // Min date for group (today)
  minDate = new Date().toISOString().split('T')[0];

  // Computed
  currentStepIndex = computed(() => {
    const steps = this.getSteps();
    return steps.indexOf(this.currentStep());
  });

  getSteps(): CreateStep[] {
    return ['basic', 'details', 'image', 'review'];
  }

  getStepTitle(): string {
    switch (this.currentStep()) {
      case 'type': return 'Erstellen';
      case 'basic': return 'Grundlagen';
      case 'details': return 'Details';
      case 'image': return 'Bild';
      case 'review': return 'Überprüfen';
      default: return '';
    }
  }

  // Actions
  selectType(type: CreateType): void {
    this.createType.set(type);
    this.currentStep.set('basic');
  }

  setCategory(id: string): void {
    if (this.createType() === 'group') {
      this.groupData.category = id;
    } else {
      this.clubData.category = id;
    }
  }

  getCategory(): string {
    return this.createType() === 'group' ? this.groupData.category : this.clubData.category;
  }

  adjustMembers(delta: number): void {
    const newValue = this.groupData.maxMembers + delta;
    if (newValue >= 3 && newValue <= 10) {
      this.groupData.maxMembers = newValue;
    }
  }

  onImageSelect(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const url = reader.result as string;
        if (this.createType() === 'group') {
          this.groupData.imageUrl = url;
        } else {
          this.clubData.imageUrl = url;
        }
      };
      reader.readAsDataURL(file);
    }
  }

  removeImage(): void {
    if (this.createType() === 'group') {
      this.groupData.imageUrl = '';
    } else {
      this.clubData.imageUrl = '';
    }
  }

  // Getters for review
  getTitle(): string {
    return this.createType() === 'group' ? this.groupData.title : this.clubData.title;
  }

  getDescription(): string {
    return this.createType() === 'group' ? this.groupData.description : this.clubData.description;
  }

  getCity(): string {
    return this.createType() === 'group' ? this.groupData.city : this.clubData.city;
  }

  getImageUrl(): string {
    return this.createType() === 'group' ? this.groupData.imageUrl : this.clubData.imageUrl;
  }

  getCategoryIcon(): string {
    const cat = this.getCategory();
    return CATEGORY_META[cat as keyof typeof CATEGORY_META]?.icon || '✨';
  }

  getCategoryName(): string {
    const cat = this.getCategory();
    return CATEGORY_META[cat as keyof typeof CATEGORY_META]?.name || cat;
  }

  getCategoryColor(): string {
    const cat = this.getCategory();
    return CATEGORY_META[cat as keyof typeof CATEGORY_META]?.color || '#FD7666';
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  // Validation
  canProceed(): boolean {
    const type = this.createType();
    const step = this.currentStep();

    if (step === 'basic') {
      if (type === 'group') {
        return !!this.groupData.title && !!this.groupData.category && !!this.groupData.city;
      } else {
        return !!this.clubData.title && !!this.clubData.category && !!this.clubData.city;
      }
    }

    if (step === 'details') {
      if (type === 'group') {
        return !!this.groupData.date && !!this.groupData.time;
      }
      return true; // Club details are optional
    }

    return true; // Image step is optional
  }

  // Navigation
  previousStep(): void {
    const steps = this.getSteps();
    const idx = this.currentStepIndex();
    
    if (idx === 0) {
      this.currentStep.set('type');
      this.createType.set(null);
    } else {
      this.currentStep.set(steps[idx - 1]);
    }
  }

  nextStep(): void {
    if (!this.canProceed()) return;
    
    const steps = this.getSteps();
    const idx = this.currentStepIndex();
    
    if (idx < steps.length - 1) {
      this.currentStep.set(steps[idx + 1]);
    }
  }

  // Submit
  submit(): void {
    if (this.isSubmitting()) return;
    
    this.isSubmitting.set(true);

    const type = this.createType();
    const endpoint = type === 'group' ? '/groups' : '/clubs';
    const data = type === 'group' ? this.buildGroupPayload() : this.buildClubPayload();

    this.http.post<{ id: string }>(`${environment.apiUrl}${endpoint}`, data).subscribe({
      next: (response) => {
        this.isSubmitting.set(false);
        this.toast.success(`${type === 'group' ? 'Gruppe' : 'Club'} erfolgreich erstellt! 🎉`);
        this.created.emit({ type: type!, id: response.id });
        this.closeModal.emit();
        this.router.navigate([type === 'group' ? '/group' : '/club', response.id]);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.toast.error(err.error?.error || 'Fehler beim Erstellen');
      }
    });
  }

  private buildGroupPayload(): any {
    return {
      title: this.groupData.title,
      description: this.groupData.description || undefined,
      category: this.groupData.category,
      city: this.groupData.city,
      location: this.groupData.location || undefined,
      date: `${this.groupData.date}T${this.groupData.time}:00`,
      maxMembers: this.groupData.maxMembers,
      imageUrl: this.groupData.imageUrl || undefined
    };
  }

  private buildClubPayload(): any {
    return {
      title: this.clubData.title,
      description: this.clubData.description || undefined,
      category: this.clubData.category,
      city: this.clubData.city,
      location: this.clubData.location || undefined,
      isPrivate: this.clubData.isPrivate,
      imageUrl: this.clubData.imageUrl || undefined
    };
  }

  // Modal actions
  onBackdropClick(event: Event): void {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }

  close(): void {
    this.closeModal.emit();
  }
}