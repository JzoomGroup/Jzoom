import { ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@jzoom/database";
import type { AuthenticatedPrincipal } from "../auth/auth.types.js";
import { DatabaseService } from "../database/database.service.js";
import type { NotificationListQueryDto } from "./notifications.dto.js";

interface CreateNotificationInput {
  aggregateId: string;
  aggregateType: string;
  deepLink: string;
  event: string;
  messageAr?: string;
  messageEn: string;
  payload?: Record<string, unknown>;
  recipientUserIds: string[];
  targetId: string;
  targetType: string;
}

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function unique(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

@Injectable()
export class NotificationsService {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  async list(principal: AuthenticatedPrincipal, query: NotificationListQueryDto) {
    const readState = query.readState ?? "all";
    const notifications = await this.database.prisma.notification.findMany({
      where: {
        userId: principal.userId,
        status: { not: "CANCELLED" },
        ...(readState === "read" ? { readAt: { not: null } } : {}),
        ...(readState === "unread" ? { readAt: null } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: query.limit ?? 50,
    });
    return {
      unreadCount: await this.unreadCount(principal),
      notifications: notifications.map((notification) => this.view(notification)),
    };
  }

  async unreadCount(principal: AuthenticatedPrincipal) {
    return this.database.prisma.notification.count({
      where: {
        userId: principal.userId,
        readAt: null,
        status: { not: "CANCELLED" },
      },
    });
  }

  async markRead(id: string, principal: AuthenticatedPrincipal) {
    const notification = await this.database.prisma.notification.findUnique({ where: { id } });
    if (!notification) {
      throw new NotFoundException({
        code: "NOTIFICATION_NOT_FOUND",
        message: "The notification could not be found",
      });
    }
    if (notification.userId !== principal.userId) {
      throw new ForbiddenException({
        code: "NOTIFICATION_SCOPE_DENIED",
        message: "You can only update your own notifications",
      });
    }
    const updated = await this.database.prisma.notification.update({
      where: { id },
      data: { readAt: notification.readAt ?? new Date() },
    });
    return this.view(updated);
  }

  async markAllRead(principal: AuthenticatedPrincipal) {
    const now = new Date();
    const result = await this.database.prisma.notification.updateMany({
      where: {
        userId: principal.userId,
        readAt: null,
        status: { not: "CANCELLED" },
      },
      data: { readAt: now },
    });
    return { markedRead: result.count };
  }

  async notifyUsers(input: CreateNotificationInput): Promise<void> {
    const recipientUserIds = unique(input.recipientUserIds);
    if (recipientUserIds.length === 0) {
      return;
    }
    const now = new Date();
    const payload = json({
      ...(input.payload ?? {}),
      channelReadiness: {
        inApp: true,
        email: false,
        sms: false,
        whatsapp: false,
      },
      recipientUserIds,
    });

    await this.database.prisma.$transaction([
      this.database.prisma.notification.createMany({
        data: recipientUserIds.map((userId) => ({
          userId,
          event: input.event,
          targetType: input.targetType,
          targetId: input.targetId,
          messageAr: input.messageAr ?? null,
          messageEn: input.messageEn,
          deepLink: input.deepLink,
          status: "DELIVERED",
          deliveredAt: now,
        })),
      }),
      this.database.prisma.outboxEvent.create({
        data: {
          aggregateType: input.aggregateType,
          aggregateId: input.aggregateId,
          eventType: input.event,
          payload,
        },
      }),
    ]);
  }

  private view(notification: {
    createdAt: Date;
    deepLink: string;
    deliveredAt: Date | null;
    event: string;
    id: string;
    messageAr: string | null;
    messageEn: string | null;
    readAt: Date | null;
    status: string;
    targetId: string;
    targetType: string;
  }) {
    return {
      id: notification.id,
      event: notification.event,
      targetType: notification.targetType,
      targetId: notification.targetId,
      messageAr: notification.messageAr,
      messageEn: notification.messageEn,
      deepLink: notification.deepLink,
      status: notification.status,
      readAt: notification.readAt?.toISOString() ?? null,
      deliveredAt: notification.deliveredAt?.toISOString() ?? null,
      createdAt: notification.createdAt.toISOString(),
    };
  }
}
