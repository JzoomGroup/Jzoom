import { ForbiddenException, Inject, Injectable } from "@nestjs/common";
import type { CanActivate, ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ADMIN_ROLE_CODE, MANAGEMENT_ROLE_CODE, REQUIRED_SCOPE_KEY } from "./auth.constants.js";
import { AccessService } from "./access.service.js";
import { AuthAuditService } from "./audit.service.js";
import type { ScopeRequirement } from "./auth.types.js";
import type { RequestWithId } from "../request-context/request-with-id.js";

@Injectable()
export class ScopeGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(AccessService) private readonly access: AccessService,
    @Inject(AuthAuditService) private readonly audit: AuthAuditService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requirement = this.reflector.getAllAndOverride<ScopeRequirement>(REQUIRED_SCOPE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requirement) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithId>();
    const principal = request.auth;
    const allowed = principal ? await this.isAllowed(principal, request, requirement) : false;

    if (!allowed) {
      await this.audit.record(
        {
          ...(principal ? { actorId: principal.userId } : {}),
          eventCode: "AUTH_SCOPE_DENIED",
          entityType: "Route",
          entityId: request.originalUrl,
          after: { requirement },
          severity: "HIGH",
        },
        {
          ...(request.requestId ? { requestId: request.requestId } : {}),
          ...(request.ip ? { ipAddress: request.ip } : {}),
          ...(request.header("user-agent") ? { userAgent: request.header("user-agent")! } : {}),
        },
      );
      throw new ForbiddenException({
        code: "SCOPE_DENIED",
        message: "You do not have access to this resource",
      });
    }

    return true;
  }

  private async isAllowed(
    principal: NonNullable<RequestWithId["auth"]>,
    request: RequestWithId,
    requirement: ScopeRequirement,
  ): Promise<boolean> {
    if (
      principal.roles.includes(ADMIN_ROLE_CODE) ||
      principal.scopes.some((scope) => scope.type === "GLOBAL")
    ) {
      return true;
    }

    if (requirement.type === "GLOBAL") {
      return principal.roles.includes(MANAGEMENT_ROLE_CODE);
    }

    if (requirement.type === "CLIENT") {
      const clientId = this.param(request, requirement.clientParam ?? "clientId");
      return Boolean(
        clientId &&
        (principal.assignedClientIds.includes(clientId) ||
          principal.scopes.some(
            (scope) =>
              (scope.type === "OWN_CLIENT" || scope.type === "ASSIGNED_CLIENTS") &&
              scope.clientId === clientId,
          )),
      );
    }

    if (requirement.type === "ASSIGNED_WORK") {
      const requestId = this.param(request, requirement.requestParam ?? "requestId");
      const projectId = this.param(request, requirement.projectParam ?? "projectId");
      return this.access.hasAssignedWork(principal.userId, requestId, projectId);
    }

    const domain = this.param(request, requirement.domainParam ?? "domain");
    const teamCode = this.param(request, requirement.teamParam ?? "teamCode");
    return principal.scopes.some(
      (scope) =>
        scope.type === "TEAM_DOMAIN" &&
        (!domain || scope.domain === domain) &&
        (!teamCode || scope.teamCode === teamCode),
    );
  }

  private param(request: RequestWithId, name: string): string | undefined {
    const value = request.params[name];
    return Array.isArray(value) ? value[0] : value;
  }
}
