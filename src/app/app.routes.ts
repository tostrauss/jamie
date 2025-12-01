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

  const currentUrl = router.routerState.snapshot.url;
  if (currentUrl && currentUrl !== '/login' && currentUrl !== '/') {
    sessionStorage.setItem('redirectUrl', currentUrl);
  }

  router.navigate(['/']);
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
// ONBOARDING GUARD (check if profile complete)
// ============================================
export const onboardingGuard = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    const user = auth.currentUser();
    // Check if onboarding is complete (has required fields)
    if (!user?.city || !user?.bio) {
      router.navigate(['/onboarding']);
      return false;
    }
    return true;
  }

  router.navigate(['/']);
  return false;
};

// ============================================
// ROUTES
// ============================================
export const routes: Routes = [
  // ----------------------------------------
  // Public Routes (Guest Only)
  // ----------------------------------------
  {
    path: '',
    loadComponent: () => import('./pages/auth/landing/landing.component')
      .then(m => m.LandingComponent),
    canActivate: [guestGuard],
    title: 'Jamie - Willkommen'
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
  // Onboarding (Auth but not complete)
  // ----------------------------------------
  {
    path: 'onboarding',
    loadComponent: () => import('./pages/onboarding/onboarding.component')
      .then(m => m.OnboardingComponent),
    canActivate: [authGuard],
    title: 'Jamie - Profil einrichten'
  },

  // ----------------------------------------
  // Protected Routes (Main App)
  // ----------------------------------------
  {
    path: 'home',
    loadComponent: () => import('./pages/home/home.component')
      .then(m => m.HomeComponent),
    canActivate: [authGuard],
    title: 'Jamie - Home'
  },
  {
    path: 'favorites',
    loadComponent: () => import('./pages/favorites/favorites.component')
      .then(m => m.FavoritesComponent),
    canActivate: [authGuard],
    title: 'Jamie - Favoriten'
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
    path: 'chat/:groupId',
    loadComponent: () => import('./pages/chat/chat-room/chat-room.component')
      .then(m => m.ChatRoomComponent),
    canActivate: [authGuard],
    title: 'Jamie - Chat'
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

  // ----------------------------------------
  // Club Routes
  // ----------------------------------------
  {
    path: 'club/:id',
    loadComponent: () => import('./pages/club-detail/club-detail.component')
      .then(m => m.ClubDetailComponent),
    canActivate: [authGuard],
    title: 'Jamie - Club'
  },

  // ----------------------------------------
  // User Profile (public view)
  // ----------------------------------------
  {
    path: 'user/:id',
    loadComponent: () => import('./pages/user-profile/user-profile.component')
      .then(m => m.UserProfileComponent),
    canActivate: [authGuard],
    title: 'Jamie - Profil'
  },

  // ----------------------------------------
  // Fallback
  // ----------------------------------------
  {
    path: '**',
    redirectTo: 'home'
  }
];