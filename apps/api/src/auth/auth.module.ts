import type { DynamicModule } from "@nestjs/common";
import { Global, Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import type { ApiEnvironment } from "@jzoom/config";
import { AccessService } from "./access.service.js";
import { AdminAccessService } from "./admin-access.service.js";
import { AUTH_ENVIRONMENT } from "./auth.constants.js";
import { AuthController } from "./auth.controller.js";
import { AuthGuard } from "./auth.guard.js";
import { AuthService } from "./auth.service.js";
import { AuthAuditService } from "./audit.service.js";
import { CsrfGuard } from "./csrf.guard.js";
import { PasswordHasherService } from "./password-hasher.service.js";
import { PermissionGuard } from "./permission.guard.js";
import { RoleGuard } from "./role.guard.js";
import { ScopeGuard } from "./scope.guard.js";
import { TokenService } from "./token.service.js";

@Global()
@Module({})
export class AuthModule {
  static forRoot(environment: ApiEnvironment): DynamicModule {
    return {
      module: AuthModule,
      controllers: [AuthController],
      providers: [
        {
          provide: AUTH_ENVIRONMENT,
          useValue: {
            nodeEnvironment: environment.nodeEnvironment,
            auth: environment.auth,
          },
        },
        AccessService,
        AdminAccessService,
        AuthAuditService,
        AuthService,
        PasswordHasherService,
        TokenService,
        {
          provide: APP_GUARD,
          useClass: AuthGuard,
        },
        {
          provide: APP_GUARD,
          useClass: CsrfGuard,
        },
        {
          provide: APP_GUARD,
          useClass: RoleGuard,
        },
        {
          provide: APP_GUARD,
          useClass: PermissionGuard,
        },
        {
          provide: APP_GUARD,
          useClass: ScopeGuard,
        },
      ],
      exports: [AuthAuditService, PasswordHasherService],
    };
  }
}
