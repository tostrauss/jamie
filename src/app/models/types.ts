// src/app/models/types.ts
// Jamie App - Type Definitions

// ============================================
// USER TYPES
// ============================================
export interface User {
  id: string;
  email: string;
  username: string;
  avatarUrl: string | null;
  bio: string | null;
  city: string | null;
  isVerified: boolean;
  createdAt: string;
}

export interface UserProfile extends User {
  joinedGroups: ParticipantWithGroup[];
  createdGroups: ActivityGroup[];
  stats: UserStats;
}

export interface UserStats {
  groupsJoined: number;
  groupsCreated: number;
  activitiesAttended: number;
}

// ============================================
// ACTIVITY GROUP TYPES
// ============================================
export type ActivityCategory = 
  | 'SPORT' 
  | 'PARTY' 
  | 'KULTUR' 
  | 'NATUR' 
  | 'SOCIAL' 
  | 'FOOD' 
  | 'TRAVEL' 
  | 'GAMING' 
  | 'OTHER';

export interface ActivityGroup {
  id: string;
  title: string;
  description: string;
  category: ActivityCategory;
  location: string;
  city: string;
  date: string;
  maxMembers: number;
  currentMembers: number;
  imageUrl: string | null;
  avatarSeeds: number[];
  isActive: boolean;
  createdAt: string;
  creator: UserSummary;
  participants?: Participant[];
  isMember?: boolean;
  isPending?: boolean;
}

export interface CreateGroupRequest {
  title: string;
  description: string;
  category: ActivityCategory;
  location: string;
  city: string;
  date: string;
  maxMembers?: number;
  imageUrl?: string;
}

export interface UpdateGroupRequest extends Partial<CreateGroupRequest> {
  isActive?: boolean;
}

// ============================================
// PARTICIPANT TYPES
// ============================================
export type ParticipantStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface Participant {
  id: string;
  status: ParticipantStatus;
  message: string | null;
  joinedAt: string;
  user: UserSummary;
}

export interface ParticipantWithGroup extends Participant {
  group: ActivityGroup;
}

export interface JoinGroupRequest {
  message?: string;
}

// ============================================
// MESSAGE TYPES
// ============================================
export interface Message {
  id: string;
  content: string;
  createdAt: string;
  sender: UserSummary;
  groupId: string;
}

export interface SendMessageRequest {
  content: string;
  groupId: string;
}

// ============================================
// NOTIFICATION TYPES
// ============================================
export type NotificationType = 
  | 'JOIN_REQUEST'
  | 'REQUEST_APPROVED'
  | 'REQUEST_REJECTED'
  | 'NEW_MESSAGE'
  | 'EVENT_REMINDER'
  | 'GROUP_UPDATE';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  groupId: string | null;
}

// ============================================
// AUTH TYPES
// ============================================
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  city?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

// ============================================
// CATEGORY TYPES
// ============================================
export interface Category {
  id: ActivityCategory;
  name: string;
  iconUrl: string;
  icon: string; // Emoji or icon class
  color: string;
}

// ============================================
// UI TYPES
// ============================================
export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

export interface ModalConfig {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'info' | 'warning' | 'danger';
}

// ============================================
// API RESPONSE TYPES
// ============================================
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiError {
  error: string;
  statusCode: number;
  details?: Record<string, string[]>;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ============================================
// FILTER TYPES
// ============================================
export interface GroupFilters {
  category?: ActivityCategory;
  city?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  hasSpace?: boolean;
}

// ============================================
// HELPER TYPES
// ============================================
export interface UserSummary {
  id: string;
  username: string;
  avatarUrl: string | null;
}

// City options for the app
export const CITIES = [
  'Wien',
  'Graz', 
  'Innsbruck',
  'Hamburg',
  'Berlin',
  'München',
  'Köln'
] as const;

export type City = typeof CITIES[number];

// Category metadata
export const CATEGORY_META: Record<ActivityCategory, Omit<Category, 'id'>> = {
  SPORT: {
    name: 'Sport',
    iconUrl: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=200',
    icon: '⚽',
    color: '#10b981'
  },
  PARTY: {
    name: 'Party',
    iconUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=200',
    icon: '🎉',
    color: '#f59e0b'
  },
  KULTUR: {
    name: 'Kultur',
    iconUrl: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=200',
    icon: '🎭',
    color: '#8b5cf6'
  },
  NATUR: {
    name: 'Natur',
    iconUrl: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=200',
    icon: '🌲',
    color: '#22c55e'
  },
  SOCIAL: {
    name: 'Social',
    iconUrl: 'https://images.unsplash.com/photo-1543807535-eceef0bc6599?w=200',
    icon: '☕',
    color: '#ec4899'
  },
  FOOD: {
    name: 'Food',
    iconUrl: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=200',
    icon: '🍕',
    color: '#f97316'
  },
  TRAVEL: {
    name: 'Travel',
    iconUrl: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=200',
    icon: '✈️',
    color: '#3b82f6'
  },
  GAMING: {
    name: 'Gaming',
    iconUrl: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=200',
    icon: '🎮',
    color: '#6366f1'
  },
  OTHER: {
    name: 'Sonstiges',
    iconUrl: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=200',
    icon: '✨',
    color: '#64748b'
  }
};