// Shared domain types (mirrors of the API responses).

export type Role = "USER" | "ADMIN";
export type UserStatus = "ACTIVE" | "SUSPENDED";

/** GET /auth/me and the `user` of /auth/login and /auth/register. */
export interface SafeUser {
  id: number;
  username: string;
  name: string;
  bio: string | null;
  avatarUrl: string | null;
  createdAt: string;
  email: string;
  role: Role;
  status: UserStatus;
}

export interface AuthResponse {
  accessToken: string;
  user: SafeUser;
}

/** The only client state (Redux): the signed-in user's snapshot. */
export interface CurrentUser {
  id: number;
  name: string;
  username: string;
  email: string;
  avatarUrl: string | null;
  role: Role;
}

export interface FieldErrorDetail {
  field: string;
  constraints: string[];
}

export interface ApiErrorBody {
  statusCode: number;
  code: string;
  message: string;
  details?: unknown;
}
