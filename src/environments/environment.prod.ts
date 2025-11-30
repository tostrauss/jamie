// src/environments/environment.prod.ts
// Production Environment Configuration

export const environment = {
  production: true,
  apiUrl: 'https://api.jamie-app.com/api',
  wsUrl: 'wss://api.jamie-app.com',
  
  // App Config
  appName: 'Jamie',
  appVersion: '1.0.0',
  
  // Feature Flags
  features: {
    chat: true,
    notifications: true,
    pushNotifications: true,
    darkMode: true
  },
  
  // Pagination
  defaultPageSize: 20,
  
  // Cache TTL (in milliseconds)
  cacheTTL: {
    groups: 5 * 60 * 1000,
    categories: 60 * 60 * 1000,
    userProfile: 10 * 60 * 1000
  }
};