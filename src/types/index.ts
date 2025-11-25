/**
 * Interface for creating a new user
 * Contains the necessary fields for user registration
 */
export interface UserCreateInput {
  email: string;
  nickname?: string;
  password: string;
  edad: number;
  rolId?: number;
}

/**
 * Interface for user response data
 * Excludes sensitive information like password
 */
export interface UserResponse {
  id: string;
  email: string;
  nickname?: string | null;
  edad: number;
  role?: string | null;
  createdAt: Date;
  updatedAt?: Date;
}
