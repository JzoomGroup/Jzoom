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
import { Public, RequirePermissions, RequireRoles, RequireScope } from "./auth.decorators.js";
import {
  AcceptInvitationDto,
  InviteUserDto,
  LoginDto,
  PasswordResetConfirmDto,
  PasswordResetRequestDto,
  ReplaceRolePermissionsDto,
  ReplaceUserRolesDto,
  UpdateProfilePreferencesDto,
  UpdateUserStatusDto,
} from "./auth.dto.js";
import { AuthService } from "./auth.service.js";
import { clearAuthCookies, setAuthCookies } from "./cookie.js";
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

function publicPrincipal(principal: NonNullable<RequestWithId["auth"]>) {
  return {
    id: principal.userId,
    email: principal.email,
    displayName: principal.displayName,
    preferredLocale: principal.preferredLocale,
    userType: principal.userType,
    roles: principal.roles,
    permissions: principal.permissions,
    scopes: principal.scopes,
  };
}

@ApiTags("authentication")
@ApiExtraModels(
  AcceptInvitationDto,
  InviteUserDto,
  LoginDto,
  PasswordResetConfirmDto,
  PasswordResetRequestDto,
  ReplaceRolePermissionsDto,
  ReplaceUserRolesDto,
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
    setAuthCookies(
      response,
      this.environment,
      session.sessionToken,
      session.csrfToken,
      session.expiresAt,
    );

    return {
      user: publicPrincipal(session.principal),
      expiresAt: session.expiresAt.toISOString(),
    };
  }

  @Post("logout")
  @HttpCode(200)
  @ApiCookieAuth()
  @ApiOperation({ summary: "Revoke the current session" })
  async logout(@Req() request: RequestWithId, @Res({ passthrough: true }) response: Response) {
    await this.auth.logout(request.auth!.sessionId, request.auth!.userId, metadata(request));
    clearAuthCookies(response, this.environment);
    return { loggedOut: true };
  }

  @Get("me")
  @ApiCookieAuth()
  @ApiOperation({ summary: "Return the authenticated profile and effective access" })
  me(@Req() request: RequestWithId) {
    return { user: publicPrincipal(request.auth!) };
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
      user: publicPrincipal({ ...request.auth!, preferredLocale: input.preferredLocale }),
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

  @Post("admin/users/:userId/invalidate-sessions")
  @HttpCode(200)
  @RequireRoles(ADMIN_ROLE_CODE)
  @RequirePermissions(MANAGE_USERS_PERMISSION)
  @ApiCookieAuth()
  async invalidateSessions(@Param("userId") userId: string, @Req() request: RequestWithId) {
    await this.auth.invalidateSessions(userId, request.auth!.userId, metadata(request));
    return { invalidated: true };
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
