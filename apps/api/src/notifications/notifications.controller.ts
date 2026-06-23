import { Controller, Get, HttpCode, Inject, Param, Post, Query, Req } from "@nestjs/common";
import { ApiCookieAuth, ApiExtraModels, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { RequestWithId } from "../request-context/request-with-id.js";
import { NotificationListQueryDto } from "./notifications.dto.js";
import { NotificationsService } from "./notifications.service.js";

@ApiTags("notifications")
@ApiCookieAuth()
@ApiExtraModels(NotificationListQueryDto)
@Controller("notifications")
export class NotificationsController {
  constructor(@Inject(NotificationsService) private readonly notifications: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: "List in-app notifications for the authenticated user" })
  list(@Query() query: NotificationListQueryDto, @Req() request: RequestWithId) {
    return this.notifications.list(request.auth!, query);
  }

  @Get("unread-count")
  @ApiOperation({ summary: "Return unread in-app notification count for the authenticated user" })
  async unreadCount(@Req() request: RequestWithId) {
    return { unreadCount: await this.notifications.unreadCount(request.auth!) };
  }

  @Post("read-all")
  @HttpCode(200)
  @ApiOperation({ summary: "Mark all authenticated-user notifications as read" })
  markAllRead(@Req() request: RequestWithId) {
    return this.notifications.markAllRead(request.auth!);
  }

  @Post(":id/read")
  @HttpCode(200)
  @ApiOperation({ summary: "Mark one authenticated-user notification as read" })
  markRead(@Param("id") id: string, @Req() request: RequestWithId) {
    return this.notifications.markRead(id, request.auth!);
  }
}
