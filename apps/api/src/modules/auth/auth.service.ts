import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

import { type AuthTokens, type LoginRequest, type SignupRequest, type UserPublic } from '@cinenova/shared';

import { PrismaService } from '../../infra/prisma/prisma.service.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async signup(input: SignupRequest): Promise<{ user: UserPublic; tokens: AuthTokens }> {
    const existing = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        fullName: input.fullName,
        phone: input.phone ?? null,
        passwordHash,
        role: 'USER',
        emailVerifiedAt: null,
      },
    });

    const tokens = await this.issueTokens(user.id, user.email, user.role);
    return { user: this.toPublic(user), tokens };
  }

  async login(input: LoginRequest): Promise<{ user: UserPublic; tokens: AuthTokens }> {
    const user = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (!user || !user.passwordHash) throw new UnauthorizedException('Invalid credentials');
    const ok = await bcrypt.compare(input.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    const tokens = await this.issueTokens(user.id, user.email, user.role);
    return { user: this.toPublic(user), tokens };
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokens(stored.user.id, stored.user.email, stored.user.role);
  }

  async logout(refreshToken: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { token: refreshToken, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async getProfile(userId: string): Promise<UserPublic> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    return this.toPublic(user);
  }

  private async issueTokens(userId: string, email: string, role: string): Promise<AuthTokens> {
    const accessToken = await this.jwt.signAsync({ sub: userId, email, role });
    const expiresIn = this.parseExpiry(this.config.get<string>('JWT_EXPIRES_IN') ?? '15m');

    const refreshToken = randomBytes(48).toString('base64url');
    const refreshExpires = new Date(Date.now() + this.parseExpiry(this.config.get<string>('REFRESH_TOKEN_EXPIRES_IN') ?? '7d') * 1000);

    await this.prisma.refreshToken.create({
      data: { token: refreshToken, userId, expiresAt: refreshExpires },
    });

    return { accessToken, refreshToken, expiresIn };
  }

  private parseExpiry(input: string): number {
    const match = /^(\d+)([smhd])$/.exec(input);
    if (!match) return 900;
    const [, n, unit] = match;
    const mult = { s: 1, m: 60, h: 3600, d: 86_400 }[unit ?? 's'] ?? 1;
    return Number(n) * mult;
  }

  private toPublic(user: {
    id: string;
    email: string;
    fullName: string;
    role: 'USER' | 'STAFF' | 'ADMIN';
    avatarUrl: string | null;
    createdAt: Date;
  }): UserPublic {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt.toISOString(),
    };
  }
}
