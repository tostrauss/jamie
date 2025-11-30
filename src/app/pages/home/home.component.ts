import { Component, signal, Signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { JoinModalComponent } from '../../shared/components/modal/join-modal/join-modal.component';
import { CreateModalComponent } from '../../shared/components/modal/create-modal/create-modal.component';
import { ActivityGroup, Category } from '../../models/types';
import { BackendService } from '../../services/backend.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, JoinModalComponent, CreateModalComponent],
  templateUrl: './home.component.html' // Wir lagern das HTML aus
})
export class HomeComponent {
  private backend = inject(BackendService);
  public auth = inject(AuthService); // Public für HTML Zugriff (Logout Button)

  selectedGroup: ActivityGroup | null = null;
  isCreateModalOpen = signal(false);

  categoriesSig = this.backend.getCategories();
  groupsSig = this.backend.getGroups();

  openGroup(group: ActivityGroup) { this.selectedGroup = group; }
  closeGroup() { this.selectedGroup = null; }
  
  openCreateModal() { this.isCreateModalOpen.set(true); }
  closeCreateModal() { this.isCreateModalOpen.set(false); }
}