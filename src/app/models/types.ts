// src/app/models/types.ts

// ============================================
// USER
// ============================================
export interface User {
  id: string;
  email: string;
  username: string;
  avatarUrl?: string;
  bio?: string;
  city?: string;
  emailVerified?: boolean;
  isActive?: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
  settings?: UserSettings;
  stats?: UserStats;
}

export interface UserStats {
  groupsCreated: number;
  groupsJoined: number;
  pendingRequests?: number;
  messagesSent?: number;
  upcomingEvents?: number;
  totalGroups?: number;
  memberSince: string;
}

export interface UserSettings {
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  profileVisibility?: 'PUBLIC' | 'PRIVATE';
  showEmail?: boolean;
  showCity?: boolean;
}

export interface PublicUser {
  id: string;
  username: string;
  avatarUrl?: string;
  bio?: string;
  city?: string;
  createdAt: string;
  stats?: UserStats;
  recentGroups?: ActivityGroup[];
  isOwnProfile?: boolean;
}

// ============================================
// AUTH
// ============================================
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

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
  user: User;
  tokens: AuthTokens;
}

export interface UpdateProfileRequest {
  username?: string;
  bio?: string;
  city?: string;
  avatarUrl?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

// ============================================
// ACTIVITY GROUP
// ============================================
export interface ActivityGroup {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  category: Category;
  location: string;
  city: string;
  date: string;
  maxMembers: number;
  currentMembers: number;
  isPrivate?: boolean;
  autoApprove?: boolean;
  isActive?: boolean;
  createdAt: string;
  updatedAt?: string;
  
  // Relations
  creator: GroupCreator;
  participants?: Participant[];
  messages?: Message[];
  
  // Computed for current user
  isMember?: boolean;
  isPending?: boolean;
  isCreator?: boolean;
}

export interface GroupCreator {
  id: string;
  username: string;
  avatarUrl?: string;
}

export interface CreateGroupRequest {
  title: string;
  description?: string;
  imageUrl?: string;
  category: Category;
  location: string;
  city: string;
  date: string;
  maxMembers: number;
  isPrivate?: boolean;
  autoApprove?: boolean;
}

export interface UpdateGroupRequest {
  title?: string;
  description?: string;
  imageUrl?: string;
  category?: Category;
  location?: string;
  city?: string;
  date?: string;
  maxMembers?: number;
  isPrivate?: boolean;
  autoApprove?: boolean;
}

export interface GroupsResponse {
  groups: ActivityGroup[];
  total: number;
  hasMore: boolean;
}

export interface GroupFilters {
  category?: Category;
  city?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  hasSpace?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: 'date' | 'popularity' | 'newest';
  sortOrder?: 'asc' | 'desc';
}

// ============================================
// PARTICIPANT
// ============================================
export interface Participant {
  id: string;
  status: ParticipantStatus;
  message?: string;
  role: ParticipantRole;
  joinedAt: string;
  updatedAt?: string;
  
  // Relations
  user: ParticipantUser;
  groupId?: string;
}

export interface ParticipantUser {
  id: string;
  username: string;
  avatarUrl?: string;
}

export interface JoinGroupRequest {
  message?: string;
}

export interface ParticipantsResponse {
  participants: Participant[];
  isCreator: boolean;
}

export type ParticipantStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type ParticipantRole = 'MEMBER' | 'MODERATOR' | 'ADMIN';

// ============================================
// MESSAGE
// ============================================
export interface Message {
  id: string;
  content: string;
  mediaUrl?: string;
  mediaType?: MediaType;
  isEdited?: boolean;
  isDeleted?: boolean;
  createdAt: string;
  updatedAt?: string;
  
  // Relations
  sender: MessageSender;
  groupId: string;
}

export interface MessageSender {
  id: string;
  username: string;
  avatarUrl?: string;
}

export interface SendMessageRequest {
  content: string;
  mediaUrl?: string;
  mediaType?: MediaType;
}

export interface MessagesResponse {
  messages: Message[];
  total: number;
  hasMore: boolean;
}

export type MediaType = 'IMAGE' | 'VIDEO' | 'AUDIO' | 'FILE';

// ============================================
// CHAT ROOM
// ============================================
export interface ChatRoom {
  group: ChatRoomGroup;
  lastMessage: Message | null;
  unreadCount: number;
}

export interface ChatRoomGroup {
  id: string;
  title: string;
  imageUrl?: string;
  category: Category;
  currentMembers: number;
  creator: GroupCreator;
}

// ============================================
// NOTIFICATION
// ============================================
export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  
  // Relations
  userId: string;
  groupId?: string;
  group?: NotificationGroup;
}

export interface NotificationGroup {
  id: string;
  title: string;
  imageUrl?: string;
  category: Category;
}

export interface NotificationsResponse {
  notifications: Notification[];
  total: number;
  unreadCount: number;
  hasMore: boolean;
}

export type NotificationType =
  | 'JOIN_REQUEST'
  | 'REQUEST_APPROVED'
  | 'REQUEST_REJECTED'
  | 'NEW_MESSAGE'
  | 'GROUP_UPDATED'
  | 'GROUP_DELETED'
  | 'MEMBER_LEFT'
  | 'REMINDER';

// ============================================
// CATEGORY
// ============================================
export type Category =
  | 'SPORT'
  | 'PARTY'
  | 'KULTUR'
  | 'NATUR'
  | 'SOCIAL'
  | 'FOOD'
  | 'TRAVEL'
  | 'GAMING'
  | 'OTHER';

export interface CategoryMeta {
  name: string;
  icon: string;
  color: string;
  description?: string;
}

export const CATEGORY_META: Record<Category, CategoryMeta> = {
  SPORT: {
    name: 'Sport',
    icon: '⚽',
    color: '#22c55e',
    description: 'Fußball, Basketball, Laufen, Fitness...'
  },
  PARTY: {
    name: 'Party',
    icon: '🎉',
    color: '#ec4899',
    description: 'Clubs, Bars, Feiern, Festivals...'
  },
  KULTUR: {
    name: 'Kultur',
    icon: '🎭',
    color: '#8b5cf6',
    description: 'Museen, Theater, Konzerte, Kunst...'
  },
  NATUR: {
    name: 'Natur',
    icon: '🏔️',
    color: '#10b981',
    description: 'Wandern, Camping, Parks, Ausflüge...'
  },
  SOCIAL: {
    name: 'Social',
    icon: '👥',
    color: '#3b82f6',
    description: 'Networking, Meetups, Stammtisch...'
  },
  FOOD: {
    name: 'Food',
    icon: '🍕',
    color: '#f59e0b',
    description: 'Restaurants, Kochen, Food Tours...'
  },
  TRAVEL: {
    name: 'Travel',
    icon: '✈️',
    color: '#06b6d4',
    description: 'Roadtrips, Städtetrips, Reisen...'
  },
  GAMING: {
    name: 'Gaming',
    icon: '🎮',
    color: '#6366f1',
    description: 'Videospiele, Brettspiele, LAN-Partys...'
  },
  OTHER: {
    name: 'Sonstiges',
    icon: '✨',
    color: '#ff7043',
    description: 'Alles andere...'
  }
};

export const CATEGORIES: Category[] = [
  'SPORT',
  'PARTY',
  'KULTUR',
  'NATUR',
  'SOCIAL',
  'FOOD',
  'TRAVEL',
  'GAMING',
  'OTHER'
];

// ============================================
// CITIES
// ============================================
export const AVAILABLE_CITIES = [
  'Wien',
  'Graz',
  'Innsbruck',
  'Hamburg',
  'Berlin',
  'München',
  'Köln'
] as const;

export type AvailableCity = typeof AVAILABLE_CITIES[number];

// ============================================
// API RESPONSES
// ============================================
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiError {
  error: string;
  message?: string;
  statusCode?: number;
  details?: Record<string, string>;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ============================================
// SOCKET EVENTS
// ============================================
export interface SocketEvents {
  // Server -> Client
  group_created: ActivityGroup;
  group_updated: ActivityGroup;
  group_deleted: { id: string };
  join_request: { groupId: string; participant: Participant };
  request_response: { groupId: string; status: ParticipantStatus; groupTitle: string };
  member_joined: { groupId: string; member: ParticipantUser };
  member_left: { userId: string; groupId: string };
  new_message: Message;
  message_deleted: { messageId: string; groupId: string };
  notification: Notification;
  user_online: { userId: string };
  user_offline: { userId: string };
  user_typing: { userId: string; groupId: string; isTyping: boolean };
  error: { message: string };
  
  // Client -> Server
  join_group: string;
  leave_group: string;
  send_message: { groupId: string; content: string };
  typing_start: string;
  typing_stop: string;
  mark_read: string;
}

// ============================================
// UI TYPES
// ============================================
export interface Tab {
  id: string;
  label: string;
  icon?: string;
  badge?: number;
}

export interface MenuItem {
  id: string;
  label: string;
  icon?: string;
  route?: string;
  action?: () => void;
  disabled?: boolean;
  divider?: boolean;
  danger?: boolean;
}

export interface ModalConfig {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'info' | 'warning' | 'danger' | 'success';
}

export interface FilterOption<T = string> {
  value: T;
  label: string;
  icon?: string;
  count?: number;
}

export interface SortOption {
  value: string;
  label: string;
  direction?: 'asc' | 'desc';
}

// ============================================
// FORM TYPES
// ============================================
export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'textarea' | 'select' | 'date' | 'number' | 'checkbox';
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  options?: { value: string; label: string }[];
  hint?: string;
  errorMessages?: Record<string, string>;
}

export interface ValidationError {
  field: string;
  message: string;
}

// ============================================
// DATE HELPERS
// ============================================
export interface DateRange {
  from: Date | null;
  to: Date | null;
}

export type QuickDateOption = 'today' | 'tomorrow' | 'weekend' | 'week' | 'month';

// ============================================
// UTILITY TYPES
// ============================================
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> =
  Pick<T, Exclude<keyof T, Keys>> &
  { [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>> }[Keys];

// ============================================
// CONSTANTS
// ============================================
export const DEFAULT_AVATAR_URL = 'https://api.dicebear.com/7.x/avataaars/svg?seed=default';
export const DEFAULT_GROUP_IMAGE = 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800';

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
export const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;