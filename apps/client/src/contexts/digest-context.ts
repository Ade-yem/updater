import type { DigestDto } from '@repo/shared';
import { createContext } from 'react';
import type { DigestListParams } from '../lib/api';

export type LiveStatus = 'idle' | 'processing' | 'completed' | 'failed' | 'no_emails';

export interface HistoryState {
  items: DigestDto[];
  total: number;
  skip: number;
  take: number;
  isLoading: boolean;
  error: string | null;
}

export interface VoiceAnnouncementsState {
  enabled: boolean;
  toggle: () => void;
  supported: boolean;
  speak: (text: string) => void;
}

export interface NotificationsState {
  enabled: boolean;
  permission: NotificationPermission;
  supported: boolean;
  toggle: () => void;
}

export interface DigestContextValue {
  today: DigestDto | null | undefined;
  todayError: string | null;
  refreshToday: () => Promise<void>;
  triggerRefresh: () => Promise<void>;
  isRefreshing: boolean;
  liveStatus: LiveStatus;
  liveError: string | null;
  sseConnected: boolean;
  history: HistoryState;
  fetchHistory: (params?: DigestListParams) => Promise<void>;
  voice: VoiceAnnouncementsState;
  push: NotificationsState;
}

export const DigestContext = createContext<DigestContextValue | null>(null);
