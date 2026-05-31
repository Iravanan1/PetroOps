import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import * as crypto from 'crypto';

export interface UserSession {
  userId: string;
  email: string;
  role: string;
  tenantId: string;
  token: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  public async validateUserCredentials(email: string, passwordPlain: string): Promise<UserSession> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { tenant: true }
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Authentication failed. Account disabled or not found.');
    }

    const hash = crypto.createHash('sha256').update(passwordPlain).digest('hex');
    if (user.passwordHash !== hash) {
      throw new UnauthorizedException('Authentication failed. Invalid password credentials.');
    }

    // Generate lightweight mock JWT tokens for validation
    const token = crypto.randomBytes(32).toString('hex');
    const refreshToken = crypto.randomBytes(32).toString('hex');

    return {
      userId: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      token,
      refreshToken
    };
  }
}
