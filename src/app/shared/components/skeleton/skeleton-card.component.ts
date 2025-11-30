// src/app/shared/components/skeleton/skeleton-card.component.ts
// Jamie App - Skeleton Loading Card Component

import { Component } from '@angular/core';

@Component({
  selector: 'app-skeleton-card',
  standalone: true,
  template: `
    <div class="bg-[#2e2e42] rounded-2xl overflow-hidden border border-white/5 animate-pulse">
      <!-- Image skeleton -->
      <div class="h-32 sm:h-36 w-full bg-[#3e3e52]"></div>
      
      <!-- Content skeleton -->
      <div class="p-3">
        <!-- Title -->
        <div class="h-4 bg-[#3e3e52] rounded w-3/4 mb-2"></div>
        
        <!-- Date/Location -->
        <div class="h-3 bg-[#3e3e52] rounded w-1/2 mb-3"></div>
        
        <!-- Bottom row -->
        <div class="flex justify-between items-center">
          <!-- Avatars -->
          <div class="flex -space-x-2">
            <div class="w-6 h-6 rounded-full bg-[#3e3e52]"></div>
            <div class="w-6 h-6 rounded-full bg-[#3e3e52]"></div>
            <div class="w-6 h-6 rounded-full bg-[#3e3e52]"></div>
          </div>
          <!-- Button -->
          <div class="w-7 h-7 rounded-full bg-[#3e3e52]"></div>
        </div>
      </div>
    </div>
  `
})
export class SkeletonCardComponent {}