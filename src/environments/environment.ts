// src/environments/environment.ts
// Development Environment Configuration

export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api',
  wsUrl: 'ws://localhost:3000',
  
  // App Config
  appName: 'Jamie',
  appVersion: '1.0.0',
  
  // Feature Flags
  features: {
    chat: true,
    notifications: true,
    pushNotifications: false,
    darkMode: true
  },
  
  // Pagination
  defaultPageSize: 20,
  
  // Cache TTL (in milliseconds)
  cacheTTL: {
    groups: 5 * 60 * 1000,      // 5 minutes
    categories: 60 * 60 * 1000,  // 1 hour
    userProfile: 10 * 60 * 1000  // 10 minutes
  }
};