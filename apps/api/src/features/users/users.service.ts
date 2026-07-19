import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { hashPassword } from '../../common/utils/crypto';
import { UserDto } from '@repo/shared';
import { User } from '../../generated/prisma/client';

/**
 * Service handling user creation, updates, deletion - crud operations
 */
@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Creates a new user with an email and hashed password.
   *
   * @param {UserDto} data The user data including email and password.
   * @returns {Promise<void>} A promise that resolves when the user is created.
   * @throws {BadRequestException} If the email is already in use.
   */
  async createUser(data: UserDto): Promise<User> {
    // create a new user in the database
    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        passwordHash: data.passwordHash
          ? await hashPassword(data.passwordHash)
          : null,
        isActive: data.isActive,
        image: data.image,
      },
    });
    this.logger.log(`User saved successfully ${user.id}`);
    return user;
  }

  /**
   * Upserts user data in the database. If the user exists, it updates the user data; if not, it creates a new user.
   *
   * @param {UserDto} data The user data to upsert.
   * @returns {Promise<User>} A promise that resolves when the operation is complete.
   */
  async upsertUser(data: UserDto): Promise<User> {
    const user = await this.prisma.user.upsert({
      where: { email: data.email },
      update: {
        name: data.name,
        isActive: data.isActive,
        image: data.image,
      },
      create: {
        email: data.email,
        name: data.name,
        passwordHash: data.passwordHash
          ? await hashPassword(data.passwordHash)
          : null,
        isActive: data.isActive,
        image: data.image,
      },
    });
    this.logger.log(`User saved successfully ${user.id}`);
    return user;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return await this.prisma.user.findUnique({
      where: { email },
    });
  }

  async getUserById(id: string): Promise<User | null> {
    return await this.prisma.user.findUnique({
      where: { id },
    });
  }

  async deleteUserById(id: string): Promise<void> {
    await this.prisma.user.delete({
      where: { id },
    });
  }

  async deleteUserByEmail(email: string): Promise<void> {
    await this.prisma.user.delete({
      where: { email },
    });
  }

  async findUsersDueForDigest(hour: number): Promise<User[]> {
    return this.prisma.user.findMany({
      where: { isActive: true, digestTime: hour, googleAuth: { isNot: null } },
    });
  }
}
