export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER'
}

export interface UserProfile {
  name: string;
  mobile: string;
  role: UserRole;
  theme: string;
  chatHistory: ChatMessage[];
  preferences: {
    voice: string;
    speed: number;
    pitch: number;
  };
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export enum HUDState {
  IDLE = 'IDLE',
  LISTENING = 'LISTENING',
  THINKING = 'THINKING',
  SPEAKING = 'SPEAKING'
}

export interface AppConfig {
  introText: string;
  animationsEnabled: boolean;
  hudRotationSpeed: number;
}