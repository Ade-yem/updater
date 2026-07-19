export interface UserDto {
  id?: string;
  name?: string;
  email: string;
  image?: string | null;
  isActive?: boolean;
  digestTime?: number;
  passwordHash?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}
