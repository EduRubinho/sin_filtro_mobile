export interface ChatInfo {
  activityId: string;
  activityTitle: string;
  readOnly: boolean;
  availableUntil: string;
  unreadCount: number;
}

export interface ChatMessage {
  id: string;
  activityId: string;
  body: string;
  createdAt: string;
  sender: { id: string; displayName: string; avatarUrl: null; isOrganizer: boolean };
}

export interface ChatPage {
  chat: ChatInfo;
  messages: ChatMessage[];
  hasMore: boolean;
}

export type ChatSocketEvent =
  | { type: 'connected' | 'authenticated' }
  | { type: 'subscribed'; activityId: string }
  | { type: 'message'; activityId: string; message: ChatMessage }
  | { type: 'error'; message: string };
