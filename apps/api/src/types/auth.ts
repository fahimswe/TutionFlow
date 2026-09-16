export type Role = 'TUTOR' | 'ADMIN';

export interface AuthPayload {
  sub: string;
  email: string;
  role: Role;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}
