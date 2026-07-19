export interface UserDto {
  id?: string;
  name?: string;
  email: string;
  image?: string | null;
  isActive?: boolean;
  passwordHash?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}
