interface ActivityGroup {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  date: string;
  currentMembers: number; // Vereinfacht für Stabilität
  maxMembers: number;
  imageUrl: string;
  avatarSeeds: number[]; // Für zufällige Avatare
}
interface UserProfile {
  id: string;
  username: string;
  email: string;
  avatarUrl: string;
  joinedGroups: string[]; // IDs der beigetretenen Gruppen
}
interface Notification {
  id: string;
  type: 'message' | 'alert' | 'reminder';
  content: string;
  date: string;
  isRead: boolean;
}
interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: string;
  isRead: boolean;
}
interface Category {
  id: string;
  name: string;
  iconUrl: string;
}
export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}
export type { ActivityGroup, UserProfile, Notification, Message, Category };