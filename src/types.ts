export type UserRole = 'admin' | 'athlete' | 'judge';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  photoURL?: string;
}

export interface Category {
  id: string;
  name: string;
  minWeight?: number;
  maxWeight?: number;
  gender: 'M' | 'F' | 'Mixed';
}

export interface Athlete {
  id: string;
  uid: string;
  fullName: string;
  nickname: string;
  categoryId: string;
  group: string;
  professor: string;
  photoURL?: string;
  status: 'pending' | 'confirmed' | 'rejected';
  registrationDate: string;
}

export interface Match {
  id: string;
  athlete1Id?: string;
  athlete2Id?: string;
  winnerId?: string;
  round: number;
  position: number;
  status: 'pending' | 'active' | 'completed';
}

export interface Bracket {
  id: string;
  categoryId: string;
  matches: Match[];
  status: 'draft' | 'active' | 'completed';
}

export interface Score {
  id: string;
  matchId: string;
  judgeId: string;
  athleteId: string;
  points: number;
  timestamp: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  date: string;
  authorId: string;
}

export interface LiveStream {
  id: string;
  url: string;
  title: string;
  isActive: boolean;
  startedAt: string;
}

export interface Notification {
  id: string;
  uid: string;
  title: string;
  message: string;
  type: 'match_near' | 'announcement' | 'system';
  read: boolean;
  createdAt: string;
}

export interface EventSettings {
  id: string;
  eventName: string;
  eventYear: string;
  logoURL: string;
}
