import { ForbiddenException, Inject, Injectable } from "@nestjs/common";
import type { CanActivate, ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AUTH_ENVIRONMENT, IS_PUBLIC_KEY } from "./auth.constants.js";
import { parseCookies } from "./cookie.js";
import { TokenService } from "./token.service.js";
import type { AuthRuntimeEnvironment } from "./auth.types.js";
import type { RequestWithId } from "../request-context/request-with-id.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(TokenService) private readonly tokens: TokenService,
    @Inject(AUTH_ENVIRONMENT) private readonly environment: AuthRuntimeEnvironment,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithId>();
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic || SAFE_METHODS.has(request.method)) {
      return true;
    }

    const header = request.header("X-CSRF-Token");
    const cookie = parseCookies(request.headers.cookie)[this.environment.auth.csrfCookieName];
    if (
      !request.auth ||
      !header ||
      !cookie ||
      header !== cookie ||
      !this.tokens.matches(header, request.auth.csrfTokenHash)
    ) {
      throw new ForbiddenException({
        code: "CSRF_VALIDATION_FAILED",
        message: "The request could not be verified",
      });
    }

    return true;
  }
}
