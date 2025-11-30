import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { JoinModalComponent } from './components/join-modal/join-modal.component';
import { ActivityGroup, Category } from './models/types';

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

  // DATA
  categories: Category[] = [
    { id: '1', name: 'Sport', iconUrl: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&q=80&w=200' },
    { id: '2', name: 'Party', iconUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&q=80&w=200' },
    { id: '3', name: 'Kultur', iconUrl: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&q=80&w=200' },
    { id: '4', name: 'Natur', iconUrl: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&q=80&w=200' }
  ];

  groups: ActivityGroup[] = [
    {
      id: '1',
      title: 'Bar-hopping Bermudadreieck',
      description: 'Wir ziehen durch die Bars. Start im Krah Krah, dann schauen wir weiter! Wer ist dabei?',
      category: 'Party',
      location: 'Wien, Bermudadreieck',
      date: 'Fr, 20:00',
      currentMembers: 2,
      maxMembers: 5,
      avatarSeeds: [12, 45],
      imageUrl: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&q=80&w=600'
    },
    {
      id: '2',
      title: 'Sunset Volleyball',
      description: 'Locker spielen, Musik hören und den Sonnenuntergang genießen. Niveau: Hobby.',
      category: 'Sport',
      location: 'Donauinsel',
      date: 'Sa, 17:00',
      currentMembers: 3,
      maxMembers: 8,
      avatarSeeds: [33, 1, 99],
      imageUrl: 'https://images.unsplash.com/photo-1612872087720-48ca45e4c6c0?auto=format&fit=crop&q=80&w=600'
    },
    {
      id: '3',
      title: 'Museums Quartier chillen',
      description: 'Neue Ausstellung ansehen und danach auf einen Spritzer in den Hof.',
      category: 'Kultur',
      location: 'MQ Wien',
      date: 'So, 14:00',
      currentMembers: 1,
      maxMembers: 6,
      avatarSeeds: [7],
      imageUrl: 'https://images.unsplash.com/photo-1554907984-15263bfd63bd?auto=format&fit=crop&q=80&w=600'
    },
     {
      id: '4',
      title: 'Laufrunde Prater Hauptallee',
      description: 'Entspannte 5-7km durch die Hauptallee. Pace ca 6:00. Danach Frühstück?',
      category: 'Sport',
      location: 'Praterstern',
      date: 'Mo, 18:30',
      currentMembers: 4,
      maxMembers: 10,
      avatarSeeds: [101, 202, 303, 404],
      imageUrl: 'https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?auto=format&fit=crop&q=80&w=600'
    }
  ];

  openGroup(group: ActivityGroup) {
    this.selectedGroup = group;
  }

  closeGroup() {
    this.selectedGroup = null;
  }
}