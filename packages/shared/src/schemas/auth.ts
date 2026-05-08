import { z } from 'zod';

export const SignupRequest = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(8).max(72),
  fullName: z.string().min(2).max(120),
  phone: z.string().regex(/^[0-9+\-\s]{8,15}$/).optional(),
});
export type SignupRequest = z.infer<typeof SignupRequest>;

export const LoginRequest = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1),
});
export type LoginRequest = z.infer<typeof LoginRequest>;

export const AuthTokens = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number(),
});
export type AuthTokens = z.infer<typeof AuthTokens>;

export const UserPublic = z.object({
  id: z.string(),
  email: z.string(),
  fullName: z.string(),
  role: z.enum(['USER', 'STAFF', 'ADMIN']),
  avatarUrl: z.string().nullable(),
  createdAt: z.string(),
});
export type UserPublic = z.infer<typeof UserPublic>;
