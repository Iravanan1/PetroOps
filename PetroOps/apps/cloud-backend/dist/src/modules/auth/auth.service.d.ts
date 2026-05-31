import { PrismaService } from '../../prisma.service';
export interface UserSession {
    userId: string;
    email: string;
    role: string;
    tenantId: string;
    token: string;
    refreshToken: string;
}
export declare class AuthService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    validateUserCredentials(email: string, passwordPlain: string): Promise<UserSession>;
}
