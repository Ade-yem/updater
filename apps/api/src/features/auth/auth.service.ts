import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { comparePassword } from '../../common/utils/crypto';
import { ENV } from '../../config/env';
import { google } from 'googleapis';
import { UserService } from '../users/users.service';
import { UserDto } from '@repo/shared';
import { GoogleAuthRepository } from '../google/google.service';

/**
 * Service handling merchant authentication, password-based registration and login,
 * and Google OAuth2 credential verification and sign-in.
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private oauth2Client = new google.auth.OAuth2({
    clientId:  ENV.GOOGLE_CLIENT_ID,
    clientSecret: ENV.GOOGLE_CLIENT_SECRET,
    redirectUri: `${ENV.APP_URL}/auth/google/callback`,
  });
  constructor(
    private jwtService: JwtService,
    private userService: UserService,
    private googleAuth: GoogleAuthRepository,
  ) {}

  /**
   * Registers a new merchant with a business name, email, and hashed password.
   *
   * @param {string} businessName Name of the business.
   * @param {string} email Email address of the merchant.
   * @param {string} password Raw text password to be hashed.
   * @returns {Promise<{token: string, user: {email: string, name: string}}>} The signed JWT and merchant profile.
   * @throws {BadRequestException} If the email is already in use.
   */
  async register(
    name: string,
    email: string,
    password: string,
  ): Promise<{ token: string; user: UserDto }> {
    const existing = await this.userService.getUserByEmail(email);
    if (existing) {
      throw new BadRequestException('User with this email already exists');
    }

    const user = await this.userService.createUser({
      email,
      name,
      passwordHash: password,
      isActive: true,
    });

    const payload = { sub: user.id, email: user.email };
    const token = this.jwtService.sign(payload);

    return {
      token,
      user: {
        email: user.email,
        name: user.name || undefined,
        image: user.image,
      },
    };
  }

  /**
   * Validates user credentials and signs a JWT for authentication.
   *
   * @param {string} email Email address of the user.
   * @param {string} password Raw text password to verify.
   * @returns {Promise<{token: string, user: {email: string, name: string}}>} The signed JWT and merchant profile.
   * @throws {UnauthorizedException} If credentials do not match.
   */
  async login(
    email: string,
    password: string,
  ): Promise<{ token: string; user: UserDto }> {
    const user = await this.userService.getUserByEmail(email);
    if (!user) {
      throw new UnauthorizedException(
        'We do not have this email address in our records. Please register first.',
      );
    }

    const matched = await comparePassword(password, user.passwordHash!);
    if (!matched) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { sub: user.id, email: user.email };
    const token = this.jwtService.sign(payload);

    return {
      token,
      user: {
        email: user.email,
        name: user.name || '',
        image: user.image,
      },
    };
  }

  /**
   * Generates the Google OAuth2 consent screen URL.
   *
   * @returns {string} The fully formed Google OAuth2 login URL.
   */
  getGoogleAuthUrl(): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: this.googleAuth.scopes,
    });
  }

  /**
   * Exchanges Google authorization code for access token and retrieves merchant details.
   * Creates the merchant if they do not exist in the database.
   *
   * @param {string} code Authorization code received from Google callback.
   * @returns {Promise<{token: string, user: {email: string, name: string}}>} The signed JWT and merchant details.
   */
  async handleGoogleCallback(
    code: string,
  ): Promise<{ token: string; user: UserDto }> {
    try {
      // Exchange authorization code for token
      const { tokens } = await this.oauth2Client.getToken(code);
      this.oauth2Client.setCredentials(tokens);
      const oauth2 = google.oauth2({ version: 'v2', auth: this.oauth2Client });
      const { data } = await oauth2.userinfo.get();
      if (!data.email) {
        throw new BadRequestException(
          'Google did not return email information.',
        );
      }
      const user: UserDto = {
        name: data.name || undefined,
        email: data.email,
        image: data.picture || null,
        isActive: true,
      };

      // Upsert user in the database
      const upsertedUser = await this.userService.upsertUser(user);
      await this.googleAuth.saveGoogleCredentials(
        upsertedUser.id,
        data.id || '',
        tokens.refresh_token || '',
        this.googleAuth.scopes,
      );
      this.logger.log('Google credentials saved successfully');
      // Sign JWT
      const payload = { sub: upsertedUser.id, email: upsertedUser.email };
      const token = this.jwtService.sign(payload);

      return {
        token,
        user: {
          id: upsertedUser.id,
          email: upsertedUser.email,
          name: upsertedUser.name || '',
          image: upsertedUser.image,
        },
      };
    } catch (err) {
      this.logger.error('Google callback error occurred', err);
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException('Failed to complete Google Sign-In.');
    }
  }
}
