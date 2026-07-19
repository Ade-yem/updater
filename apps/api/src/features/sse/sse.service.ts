import { Injectable, MessageEvent } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { SSEEvent } from '@repo/shared';

@Injectable()
export class SseService {
  private readonly sseSubject = new Subject<{
    userId: string;
    event: SSEEvent;
  }>();

  /**
   * Broadcasts a digest event to subscribed clients.
   * Event includes userId, so only the intended recipient receives it.
   */
  broadcast(userId: string, event: SSEEvent): void {
    this.sseSubject.next({ userId, event });
  }

  /**
   * Subscribes a client to real-time digest events.
   * Only events for the specified userId are sent.
   */
  subscribe(userId: string): Observable<MessageEvent> {
    return this.sseSubject.asObservable().pipe(
      filter((data) => data.userId === userId),
      map((data) => ({
        data: data.event,
      })),
    );
  }
}
