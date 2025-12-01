// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './services/auth.service';

// ============================================
// AUTH GUARD
// ============================================
export const authGuard = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return true;
  }

  // Store attempted URL for redirect after login
  const currentUrl = router.routerState.snapshot.url;
  if (currentUrl && currentUrl !== '/login' && currentUrl !== '/') {
    sessionStorage.setItem('redirectUrl', currentUrl);
  }

  router.navigate(['/login']);
  return false;
};

// ============================================
// GUEST GUARD (only for non-authenticated users)
// ============================================
export const guestGuard = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return true;
  }

  router.navigate(['/home']);
  return false;
};

// ============================================
// ROUTES
// ============================================
export const routes: Routes = [
  // ----------------------------------------
  // Public Routes
  // ----------------------------------------
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'home'
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/auth/login/login.component')
      .then(m => m.LoginComponent),
    canActivate: [guestGuard],
    title: 'Jamie - Anmelden'
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/auth/register/register.component')
      .then(m => m.RegisterComponent),
    canActivate: [guestGuard],
    title: 'Jamie - Registrieren'
  },
  {
    path: 'forgot-password',
    loadComponent: () => import('./pages/auth/forgot-password/forgot-password.component')
      .then(m => m.ForgotPasswordComponent),
    canActivate: [guestGuard],
    title: 'Jamie - Passwort vergessen'
  },

  // ----------------------------------------
  // Protected Routes
  // ----------------------------------------
  {
    path: 'home',
    loadComponent: () => import('./pages/home/home.component')
      .then(m => m.HomeComponent),
    canActivate: [authGuard],
    title: 'Jamie - Home'
  },
  {
    path: 'explore',
    loadComponent: () => import('./pages/explore/explore.component')
      .then(m => m.ExploreComponent),
    canActivate: [authGuard],
    title: 'Jamie - Entdecken'
  },
  {
    path: 'chat',
    loadComponent: () => import('./pages/chat/chat.component')
      .then(m => m.ChatComponent),
    canActivate: [authGuard],
    title: 'Jamie - Nachrichten'
  },
  {
    path: 'notifications',
    loadComponent: () => import('./pages/notifications/notifications.component')
      .then(m => m.NotificationsComponent),
    canActivate: [authGuard],
    title: 'Jamie - Benachrichtigungen'
  },
  {
    path: 'profile',
    loadComponent: () => import('./pages/profile/profile.component')
      .then(m => m.ProfileComponent),
    canActivate: [authGuard],
    title: 'Jamie - Profil'
  },
  {
    path: 'profile/edit',
    loadComponent: () => import('./pages/profile/edit-profile/edit-profile.component')
      .then(m => m.EditProfileComponent),
    canActivate: [authGuard],
    title: 'Jamie - Profil bearbeiten'
  },
  {
    path: 'settings',
    loadComponent: () => import('./pages/settings/settings.component')
      .then(m => m.SettingsComponent),
    canActivate: [authGuard],
    title: 'Jamie - Einstellungen'
  },

  // ----------------------------------------
  // Group Routes
  // ----------------------------------------
  {
    path: 'group/:id',
    loadComponent: () => import('./pages/group-detail/group-detail.component')
      .then(m => m.GroupDetailComponent),
    canActivate: [authGuard],
    title: 'Jamie - Gruppe'
  },
  {
    path: 'group/:id/edit',
    loadComponent: () => import('./pages/group-detail/edit-group/edit-group.component')
      .then(m => m.EditGroupComponent),
    canActivate: [authGuard],
    title: 'Jamie - Gruppe bearbeiten'
  },
  {
    path: 'group/:id/members',
    loadComponent: () => import('./pages/group-detail/group-members/group-members.component')
      .then(m => m.GroupMembersComponent),
    canActivate: [authGuard],
    title: 'Jamie - Mitglieder'
  },

  // ----------------------------------------
  // User Routes
  // ----------------------------------------
  {
    path: 'user/:id',
    loadComponent: () => import('./pages/user-profile/user-profile.component')
      .then(m => m.UserProfileComponent),
    canActivate: [authGuard],
    title: 'Jamie - Benutzer'
  },

  // ----------------------------------------
  // Static Pages
  // ----------------------------------------
  {
    path: 'about',
    loadComponent: () => import('./pages/static/about/about.component')
      .then(m => m.AboutComponent),
    title: 'Jamie - Über uns'
  },
  {
    path: 'privacy',
    loadComponent: () => import('./pages/static/privacy/privacy.component')
      .then(m => m.PrivacyComponent),
    title: 'Jamie - Datenschutz'
  },
  {
    path: 'terms',
    loadComponent: () => import('./pages/static/terms/terms.component')
      .then(m => m.TermsComponent),
    title: 'Jamie - AGB'
  },
  {
    path: 'imprint',
    loadComponent: () => import('./pages/static/imprint/imprint.component')
      .then(m => m.ImprintComponent),
    title: 'Jamie - Impressum'
  },

  // ----------------------------------------
  // Error Routes
  // ----------------------------------------
  {
    path: 'not-found',
    loadComponent: () => import('./pages/errors/not-found/not-found.component')
      .then(m => m.NotFoundComponent),
    title: 'Jamie - Nicht gefunden'
  },
  {
    path: '**',
    redirectTo: 'not-found'
  }
];