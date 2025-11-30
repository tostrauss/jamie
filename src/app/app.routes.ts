import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { LoginComponent } from './pages/login/login.component';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { 
    path: '', 
    component: HomeComponent, 
    canActivate: [authGuard] // Nur für eingeloggte User!
  },
  { 
    path: 'login', 
    component: LoginComponent 
  },
  { 
    path: '**', 
    redirectTo: '' 
  }
];