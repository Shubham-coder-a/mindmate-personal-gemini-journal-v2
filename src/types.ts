export interface JournalEntry {
  id: string;
  userId: string;
  title: string;
  content: string;
  mood?: string;
  moodScore?: number; // 1 to 10
  tags?: string[];
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string; // ISO string
}

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
  relatedEntryId?: string;
}

export interface ReflectionSummary {
  id: string;
  userId: string;
  detectedMood: string;
  moodScore: number; // 1 to 10
  moodColor?: string;
  keyThemes: string[];
  positiveHighlights: string[];
  areasOfConcern: string[];
  shortReflection: string;
  mindfulPrompt: string;
  entryCountAnalyzed: number;
  createdAt: string;
}

export type NavigationTab = 'dashboard' | 'journal' | 'reflect' | 'chat';

export interface UserStats {
  totalEntries: number;
  totalConversations: number;
  primaryMood: string;
  journalingStreak: number;
}
