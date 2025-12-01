// src/app/pages/settings/settings.component.ts
import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

interface UserSettings {
  // Notifications
  pushNotifications: boolean;
  emailNotifications: boolean;
  messageNotifications: boolean;
  groupNotifications: boolean;
  friendNotifications: boolean;
  marketingEmails: boolean;
  
  // Privacy
  profileVisibility: 'public' | 'friends' | 'private';
  showOnlineStatus: boolean;
  showLastSeen: boolean;
  allowFriendRequests: boolean;
  showInSearch: boolean;
  
  // Preferences
  language: string;
  darkMode: boolean;
  autoPlayVideos: boolean;
  dataUsage: 'low' | 'medium' | 'high';
  
  // Location
  shareLocation: boolean;
  locationAccuracy: 'exact' | 'approximate' | 'city';
}

type SettingsSection = 'main' | 'notifications' | 'privacy' | 'account' | 'about';

@Component({
  selector: 'app-settings',
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
        <div class="flex items-center gap-3">
          <button 
            (click)="goBack()"
            class="w-10 h-10 bg-[#2e2e42] rounded-xl flex items-center justify-center hover:bg-[#3e3e52] transition-colors">
            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
          <h1 class="text-xl font-bold text-white">
            {{ getSectionTitle() }}
          </h1>
        </div>
      </header>

      <!-- Content -->
      <div class="px-5 pt-28 relative z-10">
        
        <!-- Main Settings Menu -->
        @if (currentSection() === 'main') {
          <div class="space-y-3 animate-fade-in">
            
            <!-- Profile Section -->
            <div class="bg-[#2e2e42] rounded-2xl border border-white/5 overflow-hidden">
              <button 
                (click)="navigateTo('/profile/edit')"
                class="w-full p-4 flex items-center gap-4 hover:bg-[#3e3e52] transition-colors">
                <div class="w-12 h-12 rounded-xl bg-[#3e3e52] overflow-hidden">
                  @if (userAvatar()) {
                    <img [src]="userAvatar()" class="w-full h-full object-cover">
                  } @else {
                    <div class="w-full h-full flex items-center justify-center text-[#FD7666] font-bold text-lg">
                      {{ userName()?.charAt(0)?.toUpperCase() || '?' }}
                    </div>
                  }
                </div>
                <div class="flex-1 text-left">
                  <p class="font-bold text-white">{{ userName() || 'Benutzer' }}</p>
                  <p class="text-sm text-gray-500">Profil bearbeiten</p>
                </div>
                <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                </svg>
              </button>
            </div>

            <!-- Settings Sections -->
            <div class="bg-[#2e2e42] rounded-2xl border border-white/5 overflow-hidden">
              <!-- Notifications -->
              <button 
                (click)="currentSection.set('notifications')"
                class="w-full p-4 flex items-center gap-4 hover:bg-[#3e3e52] transition-colors border-b border-white/5">
                <div class="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center">
                  <svg class="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
                  </svg>
                </div>
                <div class="flex-1 text-left">
                  <p class="font-medium text-white">Benachrichtigungen</p>
                  <p class="text-xs text-gray-500">Push, E-Mail, In-App</p>
                </div>
                <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                </svg>
              </button>

              <!-- Privacy -->
              <button 
                (click)="currentSection.set('privacy')"
                class="w-full p-4 flex items-center gap-4 hover:bg-[#3e3e52] transition-colors border-b border-white/5">
                <div class="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                  <svg class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                  </svg>
                </div>
                <div class="flex-1 text-left">
                  <p class="font-medium text-white">Privatsphäre</p>
                  <p class="text-xs text-gray-500">Sichtbarkeit, Standort</p>
                </div>
                <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                </svg>
              </button>

              <!-- Account -->
              <button 
                (click)="currentSection.set('account')"
                class="w-full p-4 flex items-center gap-4 hover:bg-[#3e3e52] transition-colors border-b border-white/5">
                <div class="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center">
                  <svg class="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                  </svg>
                </div>
                <div class="flex-1 text-left">
                  <p class="font-medium text-white">Account</p>
                  <p class="text-xs text-gray-500">E-Mail, Passwort, Löschen</p>
                </div>
                <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                </svg>
              </button>

              <!-- About -->
              <button 
                (click)="currentSection.set('about')"
                class="w-full p-4 flex items-center gap-4 hover:bg-[#3e3e52] transition-colors">
                <div class="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
                  <svg class="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
                <div class="flex-1 text-left">
                  <p class="font-medium text-white">Über Jamie</p>
                  <p class="text-xs text-gray-500">Version, Rechtliches</p>
                </div>
                <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                </svg>
              </button>
            </div>

            <!-- Quick Settings -->
            <div class="bg-[#2e2e42] rounded-2xl border border-white/5 overflow-hidden">
              <!-- Dark Mode -->
              <div class="p-4 flex items-center justify-between border-b border-white/5">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 bg-[#3e3e52] rounded-xl flex items-center justify-center">
                    <svg class="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>
                    </svg>
                  </div>
                  <span class="text-white">Dark Mode</span>
                </div>
                <label class="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    [(ngModel)]="settings.darkMode"
                    (change)="saveSettings()"
                    class="sr-only peer">
                  <div class="w-11 h-6 bg-[#3e3e52] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-300 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#FD7666]"></div>
                </label>
              </div>

              <!-- Language -->
              <div class="p-4 flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 bg-[#3e3e52] rounded-xl flex items-center justify-center">
                    <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"/>
                    </svg>
                  </div>
                  <span class="text-white">Sprache</span>
                </div>
                <select 
                  [(ngModel)]="settings.language"
                  (change)="saveSettings()"
                  class="bg-[#3e3e52] text-white text-sm rounded-lg px-3 py-2 border-none focus:outline-none focus:ring-2 focus:ring-[#FD7666]">
                  <option value="de">Deutsch</option>
                  <option value="en">English</option>
                </select>
              </div>
            </div>

            <!-- Logout -->
            <button 
              (click)="logout()"
              class="w-full p-4 bg-[#2e2e42] rounded-2xl border border-white/5 flex items-center gap-4 hover:bg-red-500/10 transition-colors group">
              <div class="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center">
                <svg class="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                </svg>
              </div>
              <span class="text-red-400 font-medium group-hover:text-red-300">Abmelden</span>
            </button>

            <!-- App Version -->
            <p class="text-center text-gray-600 text-xs mt-6">
              Jamie v1.0.0 • Made with ❤️
            </p>
          </div>
        }

        <!-- Notifications Settings -->
        @if (currentSection() === 'notifications') {
          <div class="space-y-4 animate-fade-in">
            
            <!-- Push Notifications -->
            <div class="bg-[#2e2e42] rounded-2xl border border-white/5 overflow-hidden">
              <h3 class="px-4 py-3 text-xs text-gray-500 uppercase font-bold tracking-wider border-b border-white/5">
                Push-Benachrichtigungen
              </h3>
              
              <div class="divide-y divide-white/5">
                <div class="p-4 flex items-center justify-between">
                  <div>
                    <p class="text-white font-medium">Push aktivieren</p>
                    <p class="text-xs text-gray-500 mt-0.5">Benachrichtigungen auf deinem Gerät</p>
                  </div>
                  <label class="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      [(ngModel)]="settings.pushNotifications"
                      (change)="saveSettings()"
                      class="sr-only peer">
                    <div class="w-11 h-6 bg-[#3e3e52] rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-300 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#FD7666]"></div>
                  </label>
                </div>

                <div class="p-4 flex items-center justify-between">
                  <div>
                    <p class="text-white font-medium">Nachrichten</p>
                    <p class="text-xs text-gray-500 mt-0.5">Bei neuen Chat-Nachrichten</p>
                  </div>
                  <label class="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      [(ngModel)]="settings.messageNotifications"
                      (change)="saveSettings()"
                      class="sr-only peer">
                    <div class="w-11 h-6 bg-[#3e3e52] rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-300 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#FD7666]"></div>
                  </label>
                </div>

                <div class="p-4 flex items-center justify-between">
                  <div>
                    <p class="text-white font-medium">Gruppen-Updates</p>
                    <p class="text-xs text-gray-500 mt-0.5">Änderungen an deinen Gruppen</p>
                  </div>
                  <label class="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      [(ngModel)]="settings.groupNotifications"
                      (change)="saveSettings()"
                      class="sr-only peer">
                    <div class="w-11 h-6 bg-[#3e3e52] rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-300 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#FD7666]"></div>
                  </label>
                </div>

                <div class="p-4 flex items-center justify-between">
                  <div>
                    <p class="text-white font-medium">Freundschaftsanfragen</p>
                    <p class="text-xs text-gray-500 mt-0.5">Neue Anfragen und Bestätigungen</p>
                  </div>
                  <label class="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      [(ngModel)]="settings.friendNotifications"
                      (change)="saveSettings()"
                      class="sr-only peer">
                    <div class="w-11 h-6 bg-[#3e3e52] rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-300 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#FD7666]"></div>
                  </label>
                </div>
              </div>
            </div>

            <!-- Email Notifications -->
            <div class="bg-[#2e2e42] rounded-2xl border border-white/5 overflow-hidden">
              <h3 class="px-4 py-3 text-xs text-gray-500 uppercase font-bold tracking-wider border-b border-white/5">
                E-Mail-Benachrichtigungen
              </h3>
              
              <div class="divide-y divide-white/5">
                <div class="p-4 flex items-center justify-between">
                  <div>
                    <p class="text-white font-medium">E-Mail aktivieren</p>
                    <p class="text-xs text-gray-500 mt-0.5">Wichtige Updates per E-Mail</p>
                  </div>
                  <label class="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      [(ngModel)]="settings.emailNotifications"
                      (change)="saveSettings()"
                      class="sr-only peer">
                    <div class="w-11 h-6 bg-[#3e3e52] rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-300 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#FD7666]"></div>
                  </label>
                </div>

                <div class="p-4 flex items-center justify-between">
                  <div>
                    <p class="text-white font-medium">Marketing</p>
                    <p class="text-xs text-gray-500 mt-0.5">Neuigkeiten und Angebote</p>
                  </div>
                  <label class="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      [(ngModel)]="settings.marketingEmails"
                      (change)="saveSettings()"
                      class="sr-only peer">
                    <div class="w-11 h-6 bg-[#3e3e52] rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-300 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#FD7666]"></div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        }

        <!-- Privacy Settings -->
        @if (currentSection() === 'privacy') {
          <div class="space-y-4 animate-fade-in">
            
            <!-- Profile Visibility -->
            <div class="bg-[#2e2e42] rounded-2xl border border-white/5 overflow-hidden">
              <h3 class="px-4 py-3 text-xs text-gray-500 uppercase font-bold tracking-wider border-b border-white/5">
                Profil-Sichtbarkeit
              </h3>
              
              <div class="p-4 space-y-3">
                @for (option of visibilityOptions; track option.value) {
                  <button 
                    (click)="settings.profileVisibility = option.value; saveSettings()"
                    class="w-full p-3 rounded-xl border-2 transition-all text-left flex items-center gap-3"
                    [class]="settings.profileVisibility === option.value 
                      ? 'bg-[#FD7666]/20 border-[#FD7666]' 
                      : 'bg-[#3e3e52] border-transparent'">
                    <div 
                      class="w-10 h-10 rounded-xl flex items-center justify-center"
                      [class]="settings.profileVisibility === option.value ? 'bg-[#FD7666]/30' : 'bg-[#2e2e42]'">
                      <span [innerHTML]="option.icon"></span>
                    </div>
                    <div>
                      <p class="font-medium text-white">{{ option.label }}</p>
                      <p class="text-xs text-gray-500">{{ option.description }}</p>
                    </div>
                  </button>
                }
              </div>
            </div>

            <!-- Online Status -->
            <div class="bg-[#2e2e42] rounded-2xl border border-white/5 overflow-hidden">
              <h3 class="px-4 py-3 text-xs text-gray-500 uppercase font-bold tracking-wider border-b border-white/5">
                Online-Status
              </h3>
              
              <div class="divide-y divide-white/5">
                <div class="p-4 flex items-center justify-between">
                  <div>
                    <p class="text-white font-medium">Online-Status anzeigen</p>
                    <p class="text-xs text-gray-500 mt-0.5">Andere sehen, wenn du online bist</p>
                  </div>
                  <label class="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      [(ngModel)]="settings.showOnlineStatus"
                      (change)="saveSettings()"
                      class="sr-only peer">
                    <div class="w-11 h-6 bg-[#3e3e52] rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-300 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#FD7666]"></div>
                  </label>
                </div>

                <div class="p-4 flex items-center justify-between">
                  <div>
                    <p class="text-white font-medium">"Zuletzt gesehen" anzeigen</p>
                    <p class="text-xs text-gray-500 mt-0.5">Andere sehen deine letzte Aktivität</p>
                  </div>
                  <label class="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      [(ngModel)]="settings.showLastSeen"
                      (change)="saveSettings()"
                      class="sr-only peer">
                    <div class="w-11 h-6 bg-[#3e3e52] rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-300 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#FD7666]"></div>
                  </label>
                </div>
              </div>
            </div>

            <!-- Discovery -->
            <div class="bg-[#2e2e42] rounded-2xl border border-white/5 overflow-hidden">
              <h3 class="px-4 py-3 text-xs text-gray-500 uppercase font-bold tracking-wider border-b border-white/5">
                Entdeckung
              </h3>
              
              <div class="divide-y divide-white/5">
                <div class="p-4 flex items-center justify-between">
                  <div>
                    <p class="text-white font-medium">In Suche anzeigen</p>
                    <p class="text-xs text-gray-500 mt-0.5">Andere können dich finden</p>
                  </div>
                  <label class="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      [(ngModel)]="settings.showInSearch"
                      (change)="saveSettings()"
                      class="sr-only peer">
                    <div class="w-11 h-6 bg-[#3e3e52] rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-300 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#FD7666]"></div>
                  </label>
                </div>

                <div class="p-4 flex items-center justify-between">
                  <div>
                    <p class="text-white font-medium">Freundschaftsanfragen erlauben</p>
                    <p class="text-xs text-gray-500 mt-0.5">Andere können dir Anfragen senden</p>
                  </div>
                  <label class="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      [(ngModel)]="settings.allowFriendRequests"
                      (change)="saveSettings()"
                      class="sr-only peer">
                    <div class="w-11 h-6 bg-[#3e3e52] rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-300 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#FD7666]"></div>
                  </label>
                </div>
              </div>
            </div>

            <!-- Location -->
            <div class="bg-[#2e2e42] rounded-2xl border border-white/5 overflow-hidden">
              <h3 class="px-4 py-3 text-xs text-gray-500 uppercase font-bold tracking-wider border-b border-white/5">
                Standort
              </h3>
              
              <div class="divide-y divide-white/5">
                <div class="p-4 flex items-center justify-between">
                  <div>
                    <p class="text-white font-medium">Standort teilen</p>
                    <p class="text-xs text-gray-500 mt-0.5">Für Gruppen in deiner Nähe</p>
                  </div>
                  <label class="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      [(ngModel)]="settings.shareLocation"
                      (change)="saveSettings()"
                      class="sr-only peer">
                    <div class="w-11 h-6 bg-[#3e3e52] rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-300 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#FD7666]"></div>
                  </label>
                </div>

                @if (settings.shareLocation) {
                  <div class="p-4">
                    <p class="text-white font-medium mb-3">Genauigkeit</p>
                    <div class="grid grid-cols-3 gap-2">
                      @for (option of locationOptions; track option.value) {
                        <button 
                          (click)="settings.locationAccuracy = option.value; saveSettings()"
                          class="p-2 rounded-xl text-center text-sm transition-all"
                          [class]="settings.locationAccuracy === option.value 
                            ? 'bg-[#FD7666] text-white' 
                            : 'bg-[#3e3e52] text-gray-400'">
                          {{ option.label }}
                        </button>
                      }
                    </div>
                  </div>
                }
              </div>
            </div>
          </div>
        }

        <!-- Account Settings -->
        @if (currentSection() === 'account') {
          <div class="space-y-4 animate-fade-in">
            
            <!-- Email -->
            <div class="bg-[#2e2e42] rounded-2xl border border-white/5 overflow-hidden">
              <h3 class="px-4 py-3 text-xs text-gray-500 uppercase font-bold tracking-wider border-b border-white/5">
                E-Mail Adresse
              </h3>
              <div class="p-4">
                <p class="text-white">{{ userEmail() }}</p>
                <button 
                  (click)="changeEmail()"
                  class="text-[#FD7666] text-sm font-medium mt-2 hover:underline">
                  E-Mail ändern
                </button>
              </div>
            </div>

            <!-- Password -->
            <div class="bg-[#2e2e42] rounded-2xl border border-white/5 overflow-hidden">
              <h3 class="px-4 py-3 text-xs text-gray-500 uppercase font-bold tracking-wider border-b border-white/5">
                Passwort
              </h3>
              <div class="p-4">
                <p class="text-gray-400 text-sm">Zuletzt geändert: Nie</p>
                <button 
                  (click)="changePassword()"
                  class="text-[#FD7666] text-sm font-medium mt-2 hover:underline">
                  Passwort ändern
                </button>
              </div>
            </div>

            <!-- Connected Accounts -->
            <div class="bg-[#2e2e42] rounded-2xl border border-white/5 overflow-hidden">
              <h3 class="px-4 py-3 text-xs text-gray-500 uppercase font-bold tracking-wider border-b border-white/5">
                Verknüpfte Accounts
              </h3>
              <div class="divide-y divide-white/5">
                <div class="p-4 flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <svg class="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    <span class="text-white">Google</span>
                  </div>
                  <span class="text-green-400 text-sm">Verbunden</span>
                </div>
                <div class="p-4 flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <svg class="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                    </svg>
                    <span class="text-white">Apple</span>
                  </div>
                  <button class="text-[#FD7666] text-sm font-medium">Verbinden</button>
                </div>
              </div>
            </div>

            <!-- Danger Zone -->
            <div class="bg-red-500/10 rounded-2xl border border-red-500/20 overflow-hidden">
              <h3 class="px-4 py-3 text-xs text-red-400 uppercase font-bold tracking-wider border-b border-red-500/20">
                Gefahrenzone
              </h3>
              <div class="p-4 space-y-3">
                <button 
                  (click)="deactivateAccount()"
                  class="w-full p-3 bg-[#2e2e42] hover:bg-[#3e3e52] rounded-xl text-left text-gray-400 hover:text-white transition-colors">
                  Account deaktivieren
                </button>
                <button 
                  (click)="deleteAccount()"
                  class="w-full p-3 bg-red-500/20 hover:bg-red-500/30 rounded-xl text-left text-red-400 font-medium transition-colors">
                  Account löschen
                </button>
              </div>
            </div>
          </div>
        }

        <!-- About -->
        @if (currentSection() === 'about') {
          <div class="space-y-4 animate-fade-in">
            
            <!-- App Info -->
            <div class="bg-[#2e2e42] rounded-2xl border border-white/5 p-6 text-center">
              <div class="w-20 h-20 bg-gradient-to-br from-[#FD7666] to-[#ff8a65] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[#FD7666]/30">
                <span class="text-3xl font-bold text-white">J</span>
              </div>
              <h2 class="text-xl font-bold text-white">Jamie</h2>
              <p class="text-gray-500 text-sm mt-1">Version 1.0.0</p>
              <p class="text-gray-600 text-xs mt-3">
                Neue Leute kennenlernen.<br>Gemeinsam was erleben.
              </p>
            </div>

            <!-- Links -->
            <div class="bg-[#2e2e42] rounded-2xl border border-white/5 overflow-hidden">
              <button 
                (click)="openLink('terms')"
                class="w-full p-4 flex items-center justify-between hover:bg-[#3e3e52] transition-colors border-b border-white/5">
                <span class="text-white">Nutzungsbedingungen</span>
                <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                </svg>
              </button>
              <button 
                (click)="openLink('privacy')"
                class="w-full p-4 flex items-center justify-between hover:bg-[#3e3e52] transition-colors border-b border-white/5">
                <span class="text-white">Datenschutz</span>
                <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                </svg>
              </button>
              <button 
                (click)="openLink('imprint')"
                class="w-full p-4 flex items-center justify-between hover:bg-[#3e3e52] transition-colors border-b border-white/5">
                <span class="text-white">Impressum</span>
                <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                </svg>
              </button>
              <button 
                (click)="openLink('support')"
                class="w-full p-4 flex items-center justify-between hover:bg-[#3e3e52] transition-colors">
                <span class="text-white">Support kontaktieren</span>
                <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                </svg>
              </button>
            </div>

            <!-- Social -->
            <div class="bg-[#2e2e42] rounded-2xl border border-white/5 p-4">
              <p class="text-gray-500 text-sm text-center mb-4">Folge uns</p>
              <div class="flex justify-center gap-4">
                <button class="w-12 h-12 bg-[#3e3e52] hover:bg-[#4e4e62] rounded-xl flex items-center justify-center transition-colors">
                  <svg class="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073z"/>
                  </svg>
                </button>
                <button class="w-12 h-12 bg-[#3e3e52] hover:bg-[#4e4e62] rounded-xl flex items-center justify-center transition-colors">
                  <svg class="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                  </svg>
                </button>
                <button class="w-12 h-12 bg-[#3e3e52] hover:bg-[#4e4e62] rounded-xl flex items-center justify-center transition-colors">
                  <svg class="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
                  </svg>
                </button>
              </div>
            </div>

            <!-- Credits -->
            <p class="text-center text-gray-600 text-xs">
              Made with ❤️ in Germany<br>
              © 2024 Jamie App
            </p>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
  `]
})
export class SettingsComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  currentSection = signal<SettingsSection>('main');

  settings: UserSettings = {
    pushNotifications: true,
    emailNotifications: true,
    messageNotifications: true,
    groupNotifications: true,
    friendNotifications: true,
    marketingEmails: false,
    profileVisibility: 'public',
    showOnlineStatus: true,
    showLastSeen: true,
    allowFriendRequests: true,
    showInSearch: true,
    language: 'de',
    darkMode: true,
    autoPlayVideos: true,
    dataUsage: 'high',
    shareLocation: true,
    locationAccuracy: 'city'
  };

  visibilityOptions = [
    { 
      value: 'public' as const, 
      label: 'Öffentlich', 
      description: 'Jeder kann dein Profil sehen',
      icon: '<svg class="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>'
    },
    { 
      value: 'friends' as const, 
      label: 'Nur Freunde', 
      description: 'Nur Freunde sehen dein Profil',
      icon: '<svg class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>'
    },
    { 
      value: 'private' as const, 
      label: 'Privat', 
      description: 'Niemand kann dein Profil sehen',
      icon: '<svg class="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>'
    }
  ];

  locationOptions = [
    { value: 'exact' as const, label: 'Genau' },
    { value: 'approximate' as const, label: 'Ungefähr' },
    { value: 'city' as const, label: 'Nur Stadt' }
  ];

  // User info signals
  userName = signal<string | null>(null);
  userEmail = signal<string | null>(null);
  userAvatar = signal<string | null>(null);

  ngOnInit(): void {
    this.loadUserInfo();
    this.loadSettings();
  }

  private loadUserInfo(): void {
    const user = this.auth.currentUser();
    if (user) {
      this.userName.set(user.username);
      this.userEmail.set(user.email);
      this.userAvatar.set(user.avatarUrl);
    }
  }

  private loadSettings(): void {
    // Load from localStorage or API
    const saved = localStorage.getItem('userSettings');
    if (saved) {
      this.settings = { ...this.settings, ...JSON.parse(saved) };
    }
  }

  saveSettings(): void {
    localStorage.setItem('userSettings', JSON.stringify(this.settings));
    
    // Also save to backend
    this.http.put(`${environment.apiUrl}/users/settings`, this.settings).subscribe({
      error: (err) => console.error('Error saving settings:', err)
    });
  }

  getSectionTitle(): string {
    switch (this.currentSection()) {
      case 'main': return 'Einstellungen';
      case 'notifications': return 'Benachrichtigungen';
      case 'privacy': return 'Privatsphäre';
      case 'account': return 'Account';
      case 'about': return 'Über Jamie';
      default: return 'Einstellungen';
    }
  }

  goBack(): void {
    if (this.currentSection() === 'main') {
      this.router.navigate(['/profile']);
    } else {
      this.currentSection.set('main');
    }
  }

  navigateTo(path: string): void {
    this.router.navigate([path]);
  }

  changeEmail(): void {
    // TODO: Open change email modal
    this.toast.info('E-Mail ändern kommt bald');
  }

  changePassword(): void {
    this.router.navigate(['/forgot-password']);
  }

  deactivateAccount(): void {
    if (!confirm('Account wirklich deaktivieren? Du kannst ihn später wieder aktivieren.')) return;
    
    this.http.post(`${environment.apiUrl}/users/deactivate`, {}).subscribe({
      next: () => {
        this.toast.success('Account deaktiviert');
        this.auth.logout();
        this.router.navigate(['/']);
      },
      error: () => this.toast.error('Fehler beim Deaktivieren')
    });
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
      error: () => this.toast.error('Fehler beim Löschen')
    });
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/']);
  }

  openLink(type: string): void {
    const urls: Record<string, string> = {
      terms: 'https://jamie-app.com/terms',
      privacy: 'https://jamie-app.com/privacy',
      imprint: 'https://jamie-app.com/imprint',
      support: 'mailto:support@jamie-app.com'
    };
    
    window.open(urls[type], '_blank');
  }
}