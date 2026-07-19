export type { UserDto } from './dto/user.dto.js';
export * from './dto/digest.dto.js';
export * from './dto/push.dto.js';

import type { DigestDto } from './dto/digest.dto.js';

export interface ApiResponse<T> {
  data: T;
  message: string;
  error: string | null;
  success: boolean;
}

export type SSEEventType =
  | 'digest.started'
  | 'digest.no_emails'
  | 'digest.completed'
  | 'digest.failed';

export interface SSEEvent {
  type: SSEEventType;
  userId: string;
  timestamp: string;
  digest?: DigestDto;
  error?: string;
}
