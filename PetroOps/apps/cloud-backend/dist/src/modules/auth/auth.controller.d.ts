import { AuthService } from './auth.service';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    login(body: {
        email: string;
        passwordPlain: string;
    }): Promise<import("./auth.service").UserSession>;
}
