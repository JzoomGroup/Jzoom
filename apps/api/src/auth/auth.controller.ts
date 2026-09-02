import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post,
  Put,
  Req,
  Res,
  UnauthorizedException,
} from "@nestjs/common";
import {
  ApiCookieAuth,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import type { Response } from "express";
import { AdminAccessService } from "./admin-access.service.js";
import {
  ADMIN_ROLE_CODE,
  AUTH_ENVIRONMENT,
  MANAGE_USERS_PERMISSION,
  MODIFY_PERMISSIONS_PERMISSION,
} from "./auth.constants.js";
import {
  AllowPasswordChangeRequired,
  Public,
  RequirePermissions,
  RequireRoles,
  RequireScope,
} from "./auth.decorators.js";
import {
  AcceptInvitationDto,
  ChangePasswordDto,
  CreateOperatingUserDto,
  InviteUserDto,
  LoginDto,
  PasswordResetConfirmDto,
  PasswordResetRequestDto,
  ReplaceRolePermissionsDto,
  ReplaceUserPermissionOverridesDto,
  ReplaceUserRolesDto,
  StartUatImpersonationDto,
  UpdateAdminUserProfileDto,
  UpdateOperatingUserScopeDto,
  UpdateProfilePreferencesDto,
  UpdateUserStatusDto,
} from "./auth.dto.js";
import { AuthService } from "./auth.service.js";
import {
  clearAuthCookies,
  clearUatImpersonationReturnCookie,
  parseCookies,
  setAuthCookies,
  setUatImpersonationReturnCookie,
} from "./cookie.js";
import type { AuthRuntimeEnvironment, RequestMetadata } from "./auth.types.js";
import type { RequestWithId } from "../request-context/request-with-id.js";

function metadata(request: RequestWithId): RequestMetadata {
  const userAgent = request.header("user-agent");
  return {
    ...(request.requestId ? { requestId: request.requestId } : {}),
    ...(request.ip ? { ipAddress: request.ip } : {}),
    ...(userAgent ? { userAgent } : {}),
  };
}

function publicPrincipal(
  principal: NonNullable<RequestWithId["auth"]>,
  uatImpersonationEnabled = false,
) {
  const canUseUatUserSwitcher =
    uatImpersonationEnabled &&
    !principal.impersonation &&
    principal.roles.includes(ADMIN_ROLE_CODE) &&
    principal.permissions.includes(MANAGE_USERS_PERMISSION);
  return {
    id: principal.userId,
    email: principal.email,
    displayName: principal.displayName,
    preferredLocale: principal.preferredLocale,
    userType: principal.userType,
    mustChangePassword: principal.mustChangePassword,
    roles: principal.roles,
    permissions: principal.permissions,
    scopes: principal.scopes,
    capabilities: { uatUserSwitcher: canUseUatUserSwitcher },
    impersonation: principal.impersonation
      ? {
          active: true,
          admin: {
            id: principal.impersonation.userId,
            email: principal.impersonation.email,
            displayName: principal.impersonation.displayName,
          },
        }
      : null,
  };
}

@ApiTags("authentication")
@ApiExtraModels(
  AcceptInvitationDto,
  ChangePasswordDto,
  CreateOperatingUserDto,
  InviteUserDto,
  LoginDto,
  PasswordResetConfirmDto,
  PasswordResetRequestDto,
  ReplaceRolePermissionsDto,
  ReplaceUserPermissionOverridesDto,
  ReplaceUserRolesDto,
  StartUatImpersonationDto,
  UpdateAdminUserProfileDto,
  UpdateOperatingUserScopeDto,
  UpdateProfilePreferencesDto,
  UpdateUserStatusDto,
)
@Controller("auth")
export class AuthController {
  constructor(
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(AdminAccessService) private readonly admin: AdminAccessService,
    @Inject(AUTH_ENVIRONMENT) private readonly environment: AuthRuntimeEnvironment,
  ) {}

  @Public()
  @Post("login")
  @HttpCode(200)
  @ApiOperation({ summary: "Create a secure authenticated session" })
  async login(
    @Body() input: LoginDto,
    @Req() request: RequestWithId,
    @Res({ passthrough: true }) response: Response,
  ) {
    const session = await this.auth.login(input.email, input.password, metadata(request));
    clearUatImpersonationReturnCookie(response, this.environment);
    setAuthCookies(
      response,
      this.environment,
      session.sessionToken,
      session.csrfToken,
      session.expiresAt,
    );

    return {
      user: publicPrincipal(session.principal, this.environment.auth.uatImpersonationEnabled),
      expiresAt: session.expiresAt.toISOString(),
    };
  }

  @Post("logout")
  @HttpCode(200)
  @AllowPasswordChangeRequired()
  @ApiCookieAuth()
  @ApiOperation({ summary: "Revoke the current session" })
  async logout(@Req() request: RequestWithId, @Res({ passthrough: true }) response: Response) {
    const impersonatorSessionToken = parseCookies(request.headers.cookie)[
      this.environment.auth.uatImpersonationCookieName
    ];
    await this.auth.logout(
      request.auth!.sessionId,
      request.auth!.userId,
      metadata(request),
      request.auth!.impersonation && impersonatorSessionToken
        ? {
            sessionToken: impersonatorSessionToken,
            userId: request.auth!.impersonation.userId,
          }
        : undefined,
    );
    clearAuthCookies(response, this.environment);
    clearUatImpersonationReturnCookie(response, this.environment);
    return { loggedOut: true };
  }

  @Get("me")
  @AllowPasswordChangeRequired()
  @ApiCookieAuth()
  @ApiOperation({ summary: "Return the authenticated profile and effective access" })
  me(@Req() request: RequestWithId) {
    return {
      user: publicPrincipal(request.auth!, this.environment.auth.uatImpersonationEnabled),
    };
  }

  @Get("uat/impersonation/users")
  @RequireRoles(ADMIN_ROLE_CODE)
  @RequirePermissions(MANAGE_USERS_PERMISSION)
  @ApiCookieAuth()
  @ApiOperation({ summary: "List active UAT users available for role testing" })
  listUatImpersonationUsers(@Req() request: RequestWithId) {
    return this.auth.listUatImpersonationUsers(request.auth!);
  }

  @Post("uat/impersonation/start")
  @HttpCode(200)
  @RequireRoles(ADMIN_ROLE_CODE)
  @RequirePermissions(MANAGE_USERS_PERMISSION)
  @ApiCookieAuth()
  @ApiOperation({ summary: "Start a short-lived UAT impersonation session" })
  async startUatImpersonation(
    @Body() input: StartUatImpersonationDto,
    @Req() request: RequestWithId,
    @Res({ passthrough: true }) response: Response,
  ) {
    const originalSessionToken = parseCookies(request.headers.cookie)[
      this.environment.auth.cookieName
    ];
    if (!originalSessionToken) {
      throw new UnauthorizedException({
        code: "AUTHENTICATION_REQUIRED",
        message: "Authentication is required",
      });
    }
    const session = await this.auth.startUatImpersonation(
      request.auth!,
      input.userId,
      metadata(request),
    );
    setUatImpersonationReturnCookie(
      response,
      this.environment,
      originalSessionToken,
      session.expiresAt,
    );
    setAuthCookies(
      response,
      this.environment,
      session.sessionToken,
      session.csrfToken,
      session.expiresAt,
    );
    return {
      started: true,
      user: publicPrincipal(session.principal, this.environment.auth.uatImpersonationEnabled),
      expiresAt: session.expiresAt.toISOString(),
    };
  }

  @Post("uat/impersonation/stop")
  @HttpCode(200)
  @AllowPasswordChangeRequired()
  @ApiCookieAuth()
  @ApiOperation({ summary: "Return from UAT impersonation to the original Admin" })
  async stopUatImpersonation(
    @Req() request: RequestWithId,
    @Res({ passthrough: true }) response: Response,
  ) {
    const impersonatorSessionToken = parseCookies(request.headers.cookie)[
      this.environment.auth.uatImpersonationCookieName
    ];
    const session = await this.auth.stopUatImpersonation(
      request.auth!,
      impersonatorSessionToken,
      metadata(request),
    );
    setAuthCookies(
      response,
      this.environment,
      session.sessionToken,
      session.csrfToken,
      session.expiresAt,
    );
    clearUatImpersonationReturnCookie(response, this.environment);
    return {
      stopped: true,
      user: publicPrincipal(session.principal, this.environment.auth.uatImpersonationEnabled),
      expiresAt: session.expiresAt.toISOString(),
    };
  }

  @Patch("me/preferences")
  @ApiCookieAuth()
  @ApiOperation({ summary: "Update the authenticated user's interface preferences" })
  async updatePreferences(
    @Body() input: UpdateProfilePreferencesDto,
    @Req() request: RequestWithId,
  ) {
    await this.auth.updatePreferredLocale(
      request.auth!.userId,
      input.preferredLocale,
      metadata(request),
    );
    return {
      user: publicPrincipal(
        { ...request.auth!, preferredLocale: input.preferredLocale },
        this.environment.auth.uatImpersonationEnabled,
      ),
    };
  }

  @Patch("me/password")
  @AllowPasswordChangeRequired()
  @ApiCookieAuth()
  @ApiOperation({ summary: "Change the authenticated user's password" })
  async changePassword(@Body() input: ChangePasswordDto, @Req() request: RequestWithId) {
    await this.auth.changePassword(
      request.auth!.userId,
      input.currentPassword,
      input.newPassword,
      input.confirmPassword,
      metadata(request),
    );
    return {
      user: publicPrincipal(
        { ...request.auth!, mustChangePassword: false },
        this.environment.auth.uatImpersonationEnabled,
      ),
    };
  }

  @Public()
  @Post("password-reset/request")
  @HttpCode(202)
  @ApiOperation({ summary: "Request a password reset without disclosing account existence" })
  async requestPasswordReset(
    @Body() input: PasswordResetRequestDto,
    @Req() request: RequestWithId,
  ) {
    const token = await this.auth.requestPasswordReset(input.email, metadata(request));
    return {
      accepted: true,
      message: "If the account is eligible, password reset instructions will be issued",
      ...(token ? { testToken: token } : {}),
    };
  }

  @Public()
  @Post("password-reset/confirm")
  @HttpCode(200)
  @ApiOperation({ summary: "Set a new password using a one-time reset token" })
  async confirmPasswordReset(
    @Body() input: PasswordResetConfirmDto,
    @Req() request: RequestWithId,
  ) {
    await this.auth.confirmPasswordReset(input.token, input.password, metadata(request));
    return { completed: true };
  }

  @Public()
  @Post("invitations/accept")
  @HttpCode(200)
  @ApiOperation({ summary: "Activate an invited account with a one-time token" })
  async acceptInvitation(@Body() input: AcceptInvitationDto, @Req() request: RequestWithId) {
    await this.auth.acceptInvitation(
      input.token,
      input.password,
      input.displayName,
      metadata(request),
    );
    return { completed: true };
  }

  @Post("admin/invitations")
  @HttpCode(202)
  @RequireRoles(ADMIN_ROLE_CODE)
  @RequirePermissions(MANAGE_USERS_PERMISSION)
  @ApiCookieAuth()
  @ApiOperation({ summary: "Create or rotate an invitation for an eligible user" })
  async invite(@Body() input: InviteUserDto, @Req() request: RequestWithId) {
    const token = await this.admin.invite(
      input,
      request.auth!.userId,
      this.environment.auth.exposeTestTokens,
      metadata(request),
    );
    return {
      accepted: true,
      message: "If the address is eligible, an invitation will be issued",
      ...(token ? { testToken: token } : {}),
    };
  }

  @Get("admin/users")
  @RequireRoles(ADMIN_ROLE_CODE)
  @RequirePermissions(MANAGE_USERS_PERMISSION)
  @ApiCookieAuth()
  @ApiOperation({ summary: "List portal users for Admin user management" })
  async listUsers() {
    return this.admin.listUsers();
  }

  @Post("admin/users")
  @HttpCode(201)
  @RequireRoles(ADMIN_ROLE_CODE)
  @RequirePermissions(MANAGE_USERS_PERMISSION)
  @ApiCookieAuth()
  @ApiOperation({ summary: "Create an internal operating user with client and service scope" })
  async createOperatingUser(@Body() input: CreateOperatingUserDto, @Req() request: RequestWithId) {
    return this.admin.createOperatingUser(input, request.auth!.userId, metadata(request));
  }

  @Patch("admin/users/:userId/profile")
  @RequireRoles(ADMIN_ROLE_CODE)
  @RequirePermissions(MANAGE_USERS_PERMISSION)
  @ApiCookieAuth()
  @ApiOperation({ summary: "Update a portal user's name, email, and interface language" })
  async updateAdminUserProfile(
    @Param("userId") userId: string,
    @Body() input: UpdateAdminUserProfileDto,
    @Req() request: RequestWithId,
  ) {
    await this.admin.updateUserProfile(
      userId,
      input,
      request.auth!.userId,
      request.auth!.sessionId,
      metadata(request),
    );
    return { updated: true };
  }

  @Get("admin/roles")
  @RequireRoles(ADMIN_ROLE_CODE)
  @RequirePermissions(MODIFY_PERMISSIONS_PERMISSION)
  @ApiCookieAuth()
  @ApiOperation({ summary: "List roles and assigned permissions for Admin access management" })
  async listRoles() {
    return this.admin.listRolesAndPermissions();
  }

  @Get("admin/permissions")
  @RequireRoles(ADMIN_ROLE_CODE)
  @RequirePermissions(MODIFY_PERMISSIONS_PERMISSION)
  @ApiCookieAuth()
  @ApiOperation({ summary: "List permissions for Admin access management" })
  async listPermissions() {
    const { permissions } = await this.admin.listRolesAndPermissions();
    return { permissions };
  }

  @Get("admin/audit-logs")
  @RequireRoles(ADMIN_ROLE_CODE)
  @RequirePermissions(MANAGE_USERS_PERMISSION)
  @ApiCookieAuth()
  @ApiOperation({ summary: "List recent security and access audit logs" })
  async listAuditLogs() {
    return this.admin.listAuditLogs();
  }

  @Post("admin/users/:userId/invalidate-sessions")
  @HttpCode(200)
  @RequireRoles(ADMIN_ROLE_CODE)
  @RequirePermissions(MANAGE_USERS_PERMISSION)
  @ApiCookieAuth()
  async invalidateSessions(@Param("userId") userId: string, @Req() request: RequestWithId) {
    await this.auth.invalidateSessions(userId, request.auth!.userId, metadata(request));
    return { invalidated: true };
  }

  @Post("admin/users/:userId/reset-password")
  @HttpCode(200)
  @RequireRoles(ADMIN_ROLE_CODE)
  @RequirePermissions(MANAGE_USERS_PERMISSION)
  @ApiCookieAuth()
  @ApiOperation({ summary: "Reset a user password to the temporary default password" })
  async resetUserPassword(@Param("userId") userId: string, @Req() request: RequestWithId) {
    await this.admin.resetUserPasswordToDefault(userId, request.auth!.userId, metadata(request));
    return { reset: true };
  }

  @Patch("admin/users/:userId/status")
  @RequireRoles(ADMIN_ROLE_CODE)
  @RequirePermissions(MANAGE_USERS_PERMISSION)
  @ApiCookieAuth()
  async updateStatus(
    @Param("userId") userId: string,
    @Body() input: UpdateUserStatusDto,
    @Req() request: RequestWithId,
  ) {
    await this.admin.setUserStatus(userId, input.status, request.auth!.userId, metadata(request));
    return { updated: true };
  }

  @Put("admin/users/:userId/roles")
  @RequireRoles(ADMIN_ROLE_CODE)
  @RequirePermissions(MODIFY_PERMISSIONS_PERMISSION)
  @ApiCookieAuth()
  async replaceUserRoles(
    @Param("userId") userId: string,
    @Body() input: ReplaceUserRolesDto,
    @Req() request: RequestWithId,
  ) {
    await this.admin.replaceUserRoles(
      userId,
      input.roleCodes,
      request.auth!.userId,
      metadata(request),
    );
    return { updated: true };
  }

  @Put("admin/users/:userId/permission-overrides")
  @RequireRoles(ADMIN_ROLE_CODE)
  @RequirePermissions(MODIFY_PERMISSIONS_PERMISSION)
  @ApiCookieAuth()
  @ApiOperation({ summary: "Replace explicit permission exceptions for a portal user" })
  async replaceUserPermissionOverrides(
    @Param("userId") userId: string,
    @Body() input: ReplaceUserPermissionOverridesDto,
    @Req() request: RequestWithId,
  ) {
    await this.admin.replaceUserPermissionOverrides(
      userId,
      input.overrides,
      request.auth!.userId,
      metadata(request),
    );
    return { updated: true };
  }

  @Put("admin/users/:userId/operating-scope")
  @RequireRoles(ADMIN_ROLE_CODE)
  @RequirePermissions(MANAGE_USERS_PERMISSION)
  @ApiCookieAuth()
  @ApiOperation({ summary: "Replace client, service, and supervisor scope for an operating user" })
  async replaceOperatingScope(
    @Param("userId") userId: string,
    @Body() input: UpdateOperatingUserScopeDto,
    @Req() request: RequestWithId,
  ) {
    await this.admin.replaceOperatingScope(userId, input, request.auth!.userId, metadata(request));
    return { updated: true };
  }

  @Put("admin/roles/:roleCode/permissions")
  @RequireRoles(ADMIN_ROLE_CODE)
  @RequirePermissions(MODIFY_PERMISSIONS_PERMISSION)
  @ApiCookieAuth()
  async replaceRolePermissions(
    @Param("roleCode") roleCode: string,
    @Body() input: ReplaceRolePermissionsDto,
    @Req() request: RequestWithId,
  ) {
    await this.admin.replaceRolePermissions(
      roleCode,
      input.permissionCodes,
      request.auth!.userId,
      metadata(request),
    );
    return { updated: true };
  }

  @Get("access/admin")
  @RequireRoles(ADMIN_ROLE_CODE)
  @RequirePermissions(MANAGE_USERS_PERMISSION)
  @ApiCookieAuth()
  @ApiOkResponse({ description: "The current user has Admin access" })
  adminAccess() {
    return { allowed: true };
  }

  @Get("access/clients/:clientId")
  @RequireScope({ type: "CLIENT" })
  @ApiCookieAuth()
  clientAccess() {
    return { allowed: true };
  }

  @Get("access/requests/:requestId")
  @RequireScope({ type: "ASSIGNED_WORK" })
  @ApiCookieAuth()
  requestAccess() {
    return { allowed: true };
  }

  @Get("access/teams/:domain/:teamCode")
  @RequireScope({ type: "TEAM_DOMAIN" })
  @ApiCookieAuth()
  teamAccess() {
    return { allowed: true };
  }

  @Get("access/global")
  @RequireScope({ type: "GLOBAL" })
  @ApiCookieAuth()
  globalAccess() {
    return { allowed: true };
  }
}
