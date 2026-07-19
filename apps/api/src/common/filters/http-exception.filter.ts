import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiResponse } from '@repo/shared';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = 500;
    let message = 'Internal server error';
    let error = 'INTERNAL_SERVER_ERROR';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const obj = exceptionResponse as any;
        message = Array.isArray(obj.message)
          ? obj.message.join('; ')
          : obj.message || exception.message;
        error = obj.error || error;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      error = exception.name;
    }

    if (status >= 500) {
      this.logger.error(`[${status}] ${error}: ${message}`, exception);
    } else {
      this.logger.debug(`[${status}] ${error}: ${message}`);
    }

    const apiResponse: ApiResponse<null> = {
      data: null,
      message,
      error,
      success: false,
    };

    response.status(status).json(apiResponse);
  }
}
