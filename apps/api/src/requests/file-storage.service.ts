import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { createHash, randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { access, mkdir, writeFile } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path";

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

function uploadRoot(): string {
  return resolve(process.env.JZOOM_UPLOAD_ROOT ?? ".jzoom-uploads");
}

function safeOriginalName(originalName: string): string {
  const name = basename(originalName)
    .replace(/[^\p{L}\p{N} .()[\]-]+/gu, "_")
    .trim();
  return name || "uploaded-file";
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
  private readonly maxBytes = requestUploadMaxBytes();

  async storeRequestFile(
    requestId: string,
    scope: "attachments" | "client-documents" | "outputs",
    file: UploadedRequestFile,
  ): Promise<StoredRequestFile> {
    if (!file.buffer || file.size < 1) {
      throw new BadRequestException({
        code: "FILE_REQUIRED",
        message: "A non-empty file is required",
      });
    }
    if (file.size > this.maxBytes) {
      throw new BadRequestException({
        code: "FILE_TOO_LARGE",
        message: `File size must not exceed ${this.maxBytes} bytes`,
      });
    }

    const originalName = safeOriginalName(file.originalname);
    const storageKey = `requests/${requestId}/${scope}/${randomUUID()}/${originalName}`;
    const absolutePath = safeStoragePath(this.root, storageKey);
    await mkdir(dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, file.buffer);

    return {
      originalName,
      mimeType: file.mimetype || "application/octet-stream",
      sizeBytes: file.size,
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
