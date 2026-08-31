import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import { createHash, randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { access, mkdir, writeFile } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path";
import { RuntimePlatformSettingsService } from "../platform-configuration/runtime-platform-settings.service.js";

export interface UploadedRequestFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

export interface StoredRequestFile {
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  storageProvider: "local";
  storageKey: string;
}

export function requestUploadMaxBytes(): number {
  const configured = Number(process.env.JZOOM_UPLOAD_MAX_BYTES);
  if (Number.isFinite(configured) && configured > 0) {
    return Math.floor(configured);
  }
  return 25 * 1024 * 1024;
}

export const DEFAULT_ALLOWED_UPLOAD_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/zip",
  "image/*",
  "text/csv",
  "text/plain",
] as const;

function uploadRoot(): string {
  return resolve(process.env.JZOOM_UPLOAD_ROOT ?? ".jzoom-uploads");
}

function safeOriginalName(originalName: string): string {
  const name = basename(originalName)
    .replace(/[^\p{L}\p{N} .()[\]-]+/gu, "_")
    .trim();
  return name || "uploaded-file";
}

function mimeTypeAllowed(mimeType: string, allowedMimeTypes: readonly string[]): boolean {
  const normalized = mimeType.trim().toLowerCase();
  return allowedMimeTypes.some((allowed) => {
    if (allowed === "*/*" || allowed === normalized) {
      return true;
    }
    return allowed.endsWith("/*") && normalized.startsWith(allowed.slice(0, -1));
  });
}

function safeStoragePath(root: string, storageKey: string): string {
  if (isAbsolute(storageKey)) {
    throw new BadRequestException({
      code: "INVALID_FILE_STORAGE_KEY",
      message: "The file storage key is invalid",
    });
  }
  const target = resolve(join(root, storageKey));
  const pathFromRoot = relative(root, target);
  if (pathFromRoot.startsWith("..") || pathFromRoot === "" || pathFromRoot.includes(":")) {
    throw new BadRequestException({
      code: "INVALID_FILE_STORAGE_KEY",
      message: "The file storage key is invalid",
    });
  }
  return target;
}

@Injectable()
export class FileStorageService {
  private readonly root = uploadRoot();

  constructor(
    @Optional()
    @Inject(RuntimePlatformSettingsService)
    private readonly settings?: RuntimePlatformSettingsService,
  ) {}

  async storeRequestFile(
    requestId: string,
    scope: "attachments" | "client-documents" | "outputs",
    file: UploadedRequestFile,
  ): Promise<StoredRequestFile> {
    return this.storeFile(`requests/${requestId}/${scope}`, file);
  }

  async storeProjectFile(
    projectId: string,
    scope: "outputs",
    file: UploadedRequestFile,
  ): Promise<StoredRequestFile> {
    return this.storeFile(`projects/${projectId}/${scope}`, file);
  }

  private async storeFile(
    directory: string,
    file: UploadedRequestFile,
  ): Promise<StoredRequestFile> {
    const actualSize = file.buffer?.byteLength ?? 0;
    if (!file.buffer || actualSize < 1) {
      throw new BadRequestException({
        code: "FILE_REQUIRED",
        message: "A non-empty file is required",
      });
    }
    const infrastructureMaxBytes = requestUploadMaxBytes();
    const configuredMaxMb = this.settings
      ? await this.settings.number("attachments.max_size_mb", {
          fallback: infrastructureMaxBytes / 1024 / 1024,
          minimum: 1,
          maximum: infrastructureMaxBytes / 1024 / 1024,
        })
      : infrastructureMaxBytes / 1024 / 1024;
    const maxBytes = Math.floor(configuredMaxMb * 1024 * 1024);
    if (actualSize > maxBytes) {
      throw new BadRequestException({
        code: "FILE_TOO_LARGE",
        message: `File size must not exceed ${maxBytes} bytes`,
      });
    }

    const mimeType = (file.mimetype || "application/octet-stream").trim().toLowerCase();
    const allowedMimeTypes = this.settings
      ? await this.settings.stringArray(
          "attachments.allowed_mime_types",
          DEFAULT_ALLOWED_UPLOAD_MIME_TYPES,
        )
      : [...DEFAULT_ALLOWED_UPLOAD_MIME_TYPES];
    if (!mimeTypeAllowed(mimeType, allowedMimeTypes)) {
      throw new BadRequestException({
        code: "FILE_TYPE_NOT_ALLOWED",
        message: "This file type is not allowed",
      });
    }

    const originalName = safeOriginalName(file.originalname);
    const storageKey = `${directory}/${randomUUID()}/${originalName}`;
    const absolutePath = safeStoragePath(this.root, storageKey);
    await mkdir(dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, file.buffer);

    return {
      originalName,
      mimeType,
      sizeBytes: actualSize,
      sha256: createHash("sha256").update(file.buffer).digest("hex"),
      storageProvider: "local",
      storageKey,
    };
  }

  async readableFile(storageKey: string) {
    const absolutePath = safeStoragePath(this.root, storageKey);
    try {
      await access(absolutePath);
    } catch {
      throw new NotFoundException({
        code: "FILE_CONTENT_NOT_FOUND",
        message: "The uploaded file content could not be found",
      });
    }
    return createReadStream(absolutePath);
  }
}
