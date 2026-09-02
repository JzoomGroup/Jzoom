import {
  ForbiddenException,
  Inject,
  Injectable,
  Optional,
  UnauthorizedException,
} from "@nestjs/common";
import type { CanActivate, ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AccessService } from "./access.service.js";
import {
  ADMIN_ROLE_CODE,
  ALLOW_PASSWORD_CHANGE_REQUIRED_KEY,
  AUTH_ENVIRONMENT,
  IS_PUBLIC_KEY,
  MANAGE_USERS_PERMISSION,
} from "./auth.constants.js";
import { parseCookies } from "./cookie.js";
import { TokenService } from "./token.service.js";
import type { AuthRuntimeEnvironment } from "./auth.types.js";
import type { RequestWithId } from "../request-context/request-with-id.js";
import { RequestContextService } from "../request-context/request-context.service.js";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(AccessService) private readonly access: AccessService,
    @Inject(TokenService) private readonly tokens: TokenService,
    @Inject(AUTH_ENVIRONMENT) private readonly environment: AuthRuntimeEnvironment,
    @Optional()
    @Inject(RequestContextService)
    private readonly requestContext?: RequestContextService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithId>();
    const cookies = parseCookies(request.headers.cookie);
    const sessionToken = cookies[this.environment.auth.cookieName];
    if (!sessionToken) {
      throw this.unauthorized();
    }

    const principal = await this.access.resolveSession(this.tokens.hash(sessionToken));
    if (!principal) {
      throw this.unauthorized();
    }

    const impersonatorToken = this.environment.auth.uatImpersonationEnabled
      ? cookies[this.environment.auth.uatImpersonationCookieName]
      : undefined;
    const impersonator = impersonatorToken
      ? await this.access.resolveSession(this.tokens.hash(impersonatorToken))
      : null;
    const validImpersonator =
      impersonator &&
      impersonator.userId !== principal.userId &&
      impersonator.roles.includes(ADMIN_ROLE_CODE) &&
      impersonator.permissions.includes(MANAGE_USERS_PERMISSION);
    request.auth = validImpersonator
      ? {
          ...principal,
          mustChangePassword: false,
          impersonation: {
            userId: impersonator.userId,
            email: impersonator.email,
            displayName: impersonator.displayName,
          },
        }
      : principal;
    if (validImpersonator) {
      this.requestContext?.setUatImpersonation({
        impersonatorUserId: impersonator.userId,
        effectiveUserId: principal.userId,
        effectiveSessionId: principal.sessionId,
      });
    }
    const allowPasswordChangeRequired = this.reflector.getAllAndOverride<boolean>(
      ALLOW_PASSWORD_CHANGE_REQUIRED_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (request.auth.mustChangePassword && !allowPasswordChangeRequired) {
      throw new ForbiddenException({
        code: "PASSWORD_CHANGE_REQUIRED",
        message: "The password must be changed before continuing",
      });
    }

    return true;
  }

  private unauthorized(): UnauthorizedException {
    return new UnauthorizedException({
      code: "AUTHENTICATION_REQUIRED",
      message: "Authentication is required",
    });
  }
}
