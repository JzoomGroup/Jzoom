import { ForbiddenException, Inject, Injectable } from "@nestjs/common";
import type { CanActivate, ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { REQUIRED_PERMISSIONS_KEY } from "./auth.constants.js";
import { AuthAuditService } from "./audit.service.js";
import type { RequestWithId } from "../request-context/request-with-id.js";

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(AuthAuditService) private readonly audit: AuthAuditService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[]>(REQUIRED_PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithId>();
    const granted = new Set(request.auth?.permissions ?? []);
    const missing = required.filter((permission) => !granted.has(permission));
    if (!request.auth || missing.length > 0) {
      await this.audit.record(
        {
          ...(request.auth ? { actorId: request.auth.userId } : {}),
          eventCode: "AUTH_PERMISSION_DENIED",
          entityType: "Route",
          entityId: request.originalUrl,
          after: { required, missing },
          severity: "HIGH",
        },
        {
          ...(request.requestId ? { requestId: request.requestId } : {}),
          ...(request.ip ? { ipAddress: request.ip } : {}),
          ...(request.header("user-agent") ? { userAgent: request.header("user-agent")! } : {}),
        },
      );
      throw new ForbiddenException({
        code: "PERMISSION_DENIED",
        message: "You do not have permission to perform this action",
      });
    }

    return true;
  }
}
