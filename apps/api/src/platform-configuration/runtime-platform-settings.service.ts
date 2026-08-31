import { Inject, Injectable } from "@nestjs/common";
import { DatabaseService } from "../database/database.service.js";

interface NumberSettingOptions {
  fallback: number;
  maximum?: number;
  minimum?: number;
}

@Injectable()
export class RuntimePlatformSettingsService {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  async value(key: string): Promise<unknown | null> {
    const now = new Date();
    const setting = await this.database.prisma.platformSetting.findFirst({
      where: { key, status: "ACTIVE" },
      select: {
        revisions: {
          where: {
            status: "ACTIVE",
            AND: [
              { OR: [{ effectiveFrom: null }, { effectiveFrom: { lte: now } }] },
              { OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }] },
            ],
          },
          orderBy: { version: "desc" },
          take: 1,
          select: { value: true },
        },
      },
    });
    return setting?.revisions[0]?.value ?? null;
  }

  async number(key: string, options: NumberSettingOptions): Promise<number> {
    const value = await this.value(key);
    const configured =
      typeof value === "number" || (typeof value === "string" && value.trim())
        ? Number(value)
        : Number.NaN;
    if (!Number.isFinite(configured)) {
      return options.fallback;
    }
    const minimum = options.minimum ?? Number.NEGATIVE_INFINITY;
    const maximum = options.maximum ?? Number.POSITIVE_INFINITY;
    return Math.min(maximum, Math.max(minimum, configured));
  }

  async stringArray(key: string, fallback: readonly string[]): Promise<string[]> {
    const configured = await this.value(key);
    if (!Array.isArray(configured)) {
      return [...fallback];
    }
    const values = configured
      .filter((value): value is string => typeof value === "string")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean);
    return values.length > 0 ? [...new Set(values)] : [...fallback];
  }

  async string(key: string, fallback: string): Promise<string> {
    const configured = await this.value(key);
    return typeof configured === "string" && configured.trim() ? configured.trim() : fallback;
  }

  async object<T extends Record<string, unknown>>(key: string, fallback: T): Promise<T> {
    const configured = await this.value(key);
    if (!configured || typeof configured !== "object" || Array.isArray(configured)) {
      return fallback;
    }
    return { ...fallback, ...(configured as Record<string, unknown>) } as T;
  }
}
