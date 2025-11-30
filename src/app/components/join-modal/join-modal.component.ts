import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-join-modal',
  standalone: true,
    imports: [CommonModule],
    templateUrl: './join-modal.component.html',
    styleUrls: ['./join-modal.component.scss']
})
export class JoinModalComponent {
  isOpen = signal(false);
  groupId = signal<string | null>(null);}


  