import { ForbiddenException, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import type { CanActivate, ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AccessService } from "./access.service.js";
import {
  ALLOW_PASSWORD_CHANGE_REQUIRED_KEY,
  AUTH_ENVIRONMENT,
  IS_PUBLIC_KEY,
} from "./auth.constants.js";
import { parseCookies } from "./cookie.js";
import { TokenService } from "./token.service.js";
import type { AuthRuntimeEnvironment } from "./auth.types.js";
import type { RequestWithId } from "../request-context/request-with-id.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(AccessService) private readonly access: AccessService,
    @Inject(TokenService) private readonly tokens: TokenService,
    @Inject(AUTH_ENVIRONMENT) private readonly environment: AuthRuntimeEnvironment,
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
    const sessionToken = parseCookies(request.headers.cookie)[this.environment.auth.cookieName];
    if (!sessionToken) {
      throw this.unauthorized();
    }

    const principal = await this.access.resolveSession(this.tokens.hash(sessionToken));
    if (!principal) {
      throw this.unauthorized();
    }

    request.auth = principal;
    const allowPasswordChangeRequired = this.reflector.getAllAndOverride<boolean>(
      ALLOW_PASSWORD_CHANGE_REQUIRED_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (
      principal.mustChangePassword &&
      !allowPasswordChangeRequired &&
      !SAFE_METHODS.has(request.method)
    ) {
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
