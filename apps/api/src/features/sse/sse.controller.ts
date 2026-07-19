import {
  Controller,
  Query,
  Sse,
  MessageEvent,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Observable } from 'rxjs';
import { SseService } from './sse.service';

@Controller('events')
export class SseController {
  constructor(
    private sseService: SseService,
    private jwtService: JwtService,
  ) {}

  /**
   * SSE stream endpoint for real-time digest progress events.
   * Requires JWT token in query parameter (browser EventSource can't send custom headers).
   *
   * @route GET /events/stream?token=<jwt>
   * @returns {Observable<MessageEvent>} Real-time Server-Sent Event stream
   */
  @Sse('stream')
  stream(@Query('token') token: string): Observable<MessageEvent> {
    if (!token) {
      throw new BadRequestException('token query parameter is required');
    }

    let payload: any;
    try {
      payload = this.jwtService.verify(token);
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const userId = payload.sub;
    if (!userId) {
      throw new UnauthorizedException('Token does not contain user ID');
    }

    return this.sseService.subscribe(userId);
  }
}
