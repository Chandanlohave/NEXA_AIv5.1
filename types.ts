export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER'
}

export interface UserProfile {
  name: string;
  mobile: string; // Now a mandatory unique identifier for users
  role: UserRole;
  gender: 'male' | 'female' | 'other';
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  isAngry?: boolean;
}

export enum HUDState {
  IDLE = 'IDLE',
  LISTENING = 'LISTENING',
  THINKING = 'THINKING',
  SPEAKING = 'SPEAKING',
  WARNING = 'WARNING', // Changed from ANGRY to WARNING
  STUDY_HUB = 'STUDY HUB' // New state for Study Hub
}

export interface AppConfig {
  animationsEnabled: boolean;
  hudRotationSpeed: number;
  micRotationSpeed: number;
  theme: 'light' | 'dark' | 'system';
}

export interface StudyHubSubject {
  courseCode: string;
  courseName: string;
  date: string; // YYYY-MM-DD
  time: string; // e.g., "2-5 PM", "10 AM - 1 PM"
}