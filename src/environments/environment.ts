// src/environments/environment.ts (Development)
export const environment = {
  production: false,
  
  // API
  apiUrl: 'http://localhost:3000/api',
  wsUrl: 'http://localhost:3000',
  
  // App Info
  appName: 'Jamie',
  appVersion: '1.0.0',
  appDescription: 'Finde spontane Aktivitäten in deiner Nähe',
  
  // Feature Flags
  features: {
    enablePushNotifications: false,
    enableEmailVerification: false,
    enableSocialLogin: false,
    enableImageUpload: true,
    enableLocationServices: true,
    enableAnalytics: false,
    enableCrashReporting: false,
    enableMaintenanceMode: false
  },
  
  // Auth
  auth: {
    tokenRefreshThreshold: 60, // seconds before expiry to refresh
    sessionTimeout: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
    maxLoginAttempts: 5,
    lockoutDuration: 15 * 60 * 1000 // 15 minutes in ms
  },
  
  // Socket
  socket: {
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
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
    maxFileSize: 5 * 1024 * 1024, // 5MB
    allowedImageTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    maxImageDimension: 2048,
    maxPhotos: 6
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
  
  // External Services (empty in dev)
  services: {
    googleMapsApiKey: '',
    sentryDsn: '',
    firebaseConfig: null,
    cloudinaryConfig: null
  },
  
  // Debug
  debug: {
    enableLogging: true,
    enableDevTools: true,
    logLevel: 'debug' // 'debug' | 'info' | 'warn' | 'error'
  }
};