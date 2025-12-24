export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER'
}

export interface UserProfile {
  name: string;
  mobile: string;
  role: UserRole;
  gender: 'male' | 'female' | 'other';
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  isAngry?: boolean;
  isIntro?: boolean;
}

export enum HUDState {
  IDLE = 'IDLE',
  LISTENING = 'LISTENING',
  THINKING = 'THINKING',
  SPEAKING = 'SPEAKING',
  WARNING = 'WARNING',
  PROTECT = 'PROTECT',
  STUDY_HUB = 'STUDY HUB',
  LATE_NIGHT = 'LATE NIGHT'
}

export interface AppConfig {
  animationsEnabled: boolean;
  hudRotationSpeed: number;
  micRotationSpeed: number;
  theme: 'light' | 'dark' | 'system';
  voiceQuality: 'intelligent' | 'hd' | 'standard';
}

export interface StudyHubSubject {
  courseCode: string;
  courseName: string;
  date: string;
  time: string;
}