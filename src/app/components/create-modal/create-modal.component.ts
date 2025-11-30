import { Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BackendService } from '../../services/backend.service';

@Component({
  selector: 'app-create-modal',
  standalone: true,
  imports: [CommonModule, FormsModule], // FormsModule ist wichtig für [(ngModel)]
  templateUrl: './create-modal.component.html'
})
export class CreateModalComponent {
  @Output() close = new EventEmitter<void>();
  
  private backend = inject(BackendService);
  
  creating = false;
  categories = ['Sport', 'Party', 'Kultur', 'Natur', 'Social'];

  formData = {
    title: '',
    category: 'Sport',
    location: '',
    date: '',
    description: ''
  };

  isValid() {
    return this.formData.title.length > 3 && this.formData.location.length > 0;
  }

  submit(event: Event) {
    event.preventDefault();
    if (!this.isValid()) return;

    this.creating = true;
    
    // Wir rufen den Service auf
    this.backend.createGroup(this.formData).subscribe({
      next: () => {
        this.creating = false;
        this.closeModal(); // Schließt das Modal nach Erfolg
      },
      error: (err) => {
        console.error(err);
        this.creating = false;
      }
    });
  }

  closeModal() {
    this.close.emit();
  }
}