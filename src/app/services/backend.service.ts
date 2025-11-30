import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivityGroup, Category } from '../models/types';
import { tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class BackendService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:3000/api'; // Adresse deines Backends

  // --- SIGNALS ---
  groups = signal<ActivityGroup[]>([]);
  
  // Kategorien können wir vorerst hardcoded lassen oder auch via API holen
  categoriesSig = signal<Category[]>([
    { id: '1', name: 'Sport', iconUrl: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=200' },
    { id: '2', name: 'Party', iconUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=200' },
    { id: '3', name: 'Kultur', iconUrl: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=200' },
    { id: '4', name: 'Natur', iconUrl: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=200' }
  ]);

  constructor() {
    this.loadGroups();
  }

  // --- API METHODS ---

  loadGroups() {
    this.http.get<ActivityGroup[]>(`${this.apiUrl}/groups`)
      .subscribe({
        next: (data) => this.groups.set(data),
        error: (err) => console.error('API Error:', err)
      });
  }

  getCategories() {
    return this.categoriesSig;
  }

  getGroups() {
    return this.groups;
  }

  createGroup(data: any) {
    return this.http.post<ActivityGroup>(`${this.apiUrl}/groups`, data).pipe(
      tap(newGroup => {
        // Optimistisches Update oder neu laden
        this.groups.update(current => [...current, newGroup]);
      })
    );
  }
  
  // ... restliche Methoden (joinGroup etc.) analog anpassen ...
}