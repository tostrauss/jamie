// src/environments/environment.types.ts
export interface Environment {
  production: boolean;
  apiUrl: string;
  wsUrl: string;
  appName: string;
  appVersion: string;
  appDescription: string;
  
  features: {
    enablePushNotifications: boolean;
    enableEmailVerification: boolean;
    enableSocialLogin: boolean;
    enableImageUpload: boolean;
    enableLocationServices: boolean;
    enableAnalytics: boolean;
    enableCrashReporting: boolean;
    enableMaintenanceMode: boolean;
  };
  
  auth: {
    tokenRefreshThreshold: number;
    sessionTimeout: number;
    maxLoginAttempts: number;
    lockoutDuration: number;
  };
  
  socket: {
    reconnectionAttempts: number;
    reconnectionDelay: number;
    reconnectionDelayMax: number;
    timeout: number;
    pingInterval: number;
    pingTimeout: number;
  };
  
  pagination: {
    defaultPageSize: number;
    maxPageSize: number;
    groupsPerPage: number;
    messagesPerPage: number;
    notificationsPerPage: number;
  };
  
  upload: {
    maxFileSize: number;
    allowedImageTypes: string[];
    maxImageDimension: number;
  };
  
  validation: {
    minPasswordLength: number;
    maxPasswordLength: number;
    minUsernameLength: number;
    maxUsernameLength: number;
    maxBioLength: number;
    maxGroupTitleLength: number;
    maxGroupDescriptionLength: number;
    maxMessageLength: number;
    minGroupMembers: number;
    maxGroupMembers: number;
  };
  
  availableCities: string[];
  
  defaults: {
    avatarUrl: string;
    groupImageUrl: string;
    coverImageUrl: string;
  };
  
  services: {
    googleMapsApiKey: string;
    sentryDsn: string;
    firebaseConfig: any;
    cloudinaryConfig: any;
  };
  
  debug: {
    enableLogging: boolean;
    enableDevTools: boolean;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
  };
}