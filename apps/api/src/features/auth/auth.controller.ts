import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Res,
  BadRequestException,
} from '@nestjs/common';
import * as express from 'express';
import { AuthService } from './auth.service';
import { z } from 'zod';
import { ENV } from '../../config/env';

const registerSchema = z.object({
  name: z.string().min(1, 'Business name is required'),
  email: z.email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const loginSchema = z.object({
  email: z.email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

/**
 * Controller exposing endpoints for merchant authentication,
 * business registration, and Google OAuth integration.
 */
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  /**
   * Endpoint to register a new merchant business.
   *
   * @route POST /auth/register
   * @param {any} body HTTP request body.
   * @returns {Promise<{token: string, user: {email: string, name: string}}>} JWT and user info.
   */
  @Post('register')
  async register(@Body() body: Record<string, unknown>) {
    const result = registerSchema.safeParse(body);
    if (!result.success) {
      const formattedErrors = result.error.issues.map((issue) => {
        const path = issue.path.join('.');
        return path ? `${path}: ${issue.message}` : issue.message;
      });
      throw new BadRequestException(formattedErrors);
    }
    return this.authService.register(
      result.data.name,
      result.data.email,
      result.data.password,
    );
  }

  /**
   * Endpoint to authenticate an existing merchant.
   *
   * @route POST /auth/login
   * @param {Record<string, unknown>} body HTTP request body.
   * @returns {Promise<{token: string, user: {email: string, name: string}}>} JWT and user info.
   */
  @Post('login')
  async login(@Body() body: Record<string, unknown>) {
    const result = loginSchema.safeParse(body);
    if (!result.success) {
      const formattedErrors = result.error.issues.map((issue) => {
        const path = issue.path.join('.');
        return path ? `${path}: ${issue.message}` : issue.message;
      });
      throw new BadRequestException(formattedErrors);
    }
    return this.authService.login(result.data.email, result.data.password);
  }

  /**
   * Endpoint that redirects the user's browser to the Google OAuth consent screen.
   *
   * @route GET /auth/google
   * @param {Response} res Express response object.
   */
  @Get('google')
  async googleRedirect(@Res() res: express.Response) {
    const url = this.authService.getGoogleAuthUrl();
    return res.redirect(url);
  }

  /**
   * Callback endpoint for Google OAuth authorization code grant flow.
   * Exchanges code for merchant info and redirects user back to the frontend with token.
   *
   * @route GET /auth/google/callback
   * @param {string} code Authorization code.
   * @param {Response} res Express response object.
   */
  @Get('google/callback')
  async googleCallback(
    @Query('code') code: string,
    @Res() res: express.Response,
  ) {
    if (!code) {
      throw new BadRequestException('Authorization code is missing');
    }
    const result = await this.authService.handleGoogleCallback(code);
    const frontendUrl = `${ENV.FRONTEND_URL}/login`;
    return res.redirect(`${frontendUrl}?token=${result.token}`);
  }
}
