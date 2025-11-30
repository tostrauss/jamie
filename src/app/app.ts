import { Component, signal, Signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { JoinModalComponent } from './components/join-modal/join-modal.component';
import { ActivityGroup, Category } from './models/types';
import { BackendService } from './services/backend.service';

@Component({
  selector: 'app-root',
  standalone: true,
  // WICHTIG: Hier importieren wir CommonModule (für *ngIf/*ngFor) und das Modal
  imports: [CommonModule, RouterOutlet, JoinModalComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  title = signal('jamie-app');
  
  // STATE
  selectedGroup: ActivityGroup | null = null;

  // Data signals are provided by the BackendService (mocked for now)
  categoriesSig!: Signal<Category[]>;
  groupsSig!: Signal<ActivityGroup[]>;

  constructor(private backend: BackendService) {
    this.categoriesSig = backend.getCategories();
    this.groupsSig = backend.getGroups();
  }

  // Simple getters so existing templates can keep using `categories` / `groups`
  get categories(): Category[] {
    return this.categoriesSig();
  }

  get groups(): ActivityGroup[] {
    return this.groupsSig();
  }

  openGroup(group: ActivityGroup) {
    this.selectedGroup = group;
  }

  closeGroup() {
    this.selectedGroup = null;
  }
}