export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER'
}

export interface UserProfile {
  name: string;
  mobile: string;
  role: UserRole;
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
  ANGRY = 'WARNING'
}

export interface AppConfig {
  animationsEnabled: boolean;
  hudRotationSpeed: number;
}