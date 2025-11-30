import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivityGroup } from '../../../../models/types';

@Component({
  selector: 'app-join-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './join-modal.component.html'
})
export class JoinModalComponent {
  // Wir erwarten eine Gruppe als Input
  @Input({ required: true }) group!: ActivityGroup;
  
  // Wir senden ein Event, wenn das Modal geschlossen werden soll
  @Output() close = new EventEmitter<void>();

  joining = false;

  join() {
    this.joining = true;
    // Simulierter API Call
    setTimeout(() => {
      this.joining = false;
      this.closeModal();
      alert(`Erfolgreich bei "${this.group.title}" angefragt!`);
    }, 1500);
  }

  closeModal() {
    this.close.emit();
  }
}
