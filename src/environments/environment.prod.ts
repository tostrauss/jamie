// src/environments/environment.production.ts (Production)
export const environment = {
  production: true,
  
  // API
  apiUrl: 'https://api.jamie-app.com/api',
  wsUrl: 'https://api.jamie-app.com',
  
  // App Info
  appName: 'Jamie',
  appVersion: '1.0.0',
  appDescription: 'Finde spontane Aktivitäten in deiner Nähe',
  
  // Feature Flags
  features: {
    enablePushNotifications: true,
    enableEmailVerification: true,
    enableSocialLogin: false,
    enableImageUpload: true,
    enableLocationServices: true,
    enableAnalytics: true,
    enableCrashReporting: true,
    enableMaintenanceMode: false
  },
  
  // Auth
  auth: {
    tokenRefreshThreshold: 60,
    sessionTimeout: 7 * 24 * 60 * 60 * 1000,
    maxLoginAttempts: 5,
    lockoutDuration: 15 * 60 * 1000
  },
  
  // Socket
  socket: {
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    timeout: 30000,
    pingInterval: 25000,
    pingTimeout: 60000
  },
  
  // Pagination
  pagination: {
    defaultPageSize: 20,
    maxPageSize: 50,
    groupsPerPage: 12,
    messagesPerPage: 50,
    notificationsPerPage: 20
  },
  
  // Upload
  upload: {
    maxFileSize: 5 * 1024 * 1024,
    allowedImageTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    maxImageDimension: 2048
  },
  
  // Validation
  validation: {
    minPasswordLength: 8,
    maxPasswordLength: 128,
    minUsernameLength: 3,
    maxUsernameLength: 30,
    maxBioLength: 500,
    maxGroupTitleLength: 60,
    maxGroupDescriptionLength: 500,
    maxMessageLength: 1000,
    minGroupMembers: 2,
    maxGroupMembers: 50
  },
  
  // Cities
  availableCities: [
    'Wien',
    'Graz',
    'Innsbruck',
    'Hamburg',
    'Berlin',
    'München',
    'Köln'
  ],
  
  // Default Images
  defaults: {
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=default',
    groupImageUrl: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800',
    coverImageUrl: 'https://images.unsplash.com/photo-1506869640319-fe1a24fd76dc?w=1200'
  },
  
  // External Services
  services: {
    googleMapsApiKey: 'YOUR_GOOGLE_MAPS_API_KEY',
    sentryDsn: 'YOUR_SENTRY_DSN',
    firebaseConfig: {
      apiKey: 'YOUR_FIREBASE_API_KEY',
      authDomain: 'jamie-app.firebaseapp.com',
      projectId: 'jamie-app',
      storageBucket: 'jamie-app.appspot.com',
      messagingSenderId: 'YOUR_SENDER_ID',
      appId: 'YOUR_APP_ID'
    },
    cloudinaryConfig: {
      cloudName: 'jamie-app',
      uploadPreset: 'jamie-uploads'
    }
  },
  
  // Debug
  debug: {
    enableLogging: false,
    enableDevTools: false,
    logLevel: 'error'
  }
};