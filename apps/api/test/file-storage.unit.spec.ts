import { BadRequestException, NotFoundException } from "@nestjs/common";
import { createHash } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FileStorageService } from "../src/requests/file-storage.service.js";

async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

describe("FileStorageService", () => {
  const previousRoot = process.env.JZOOM_UPLOAD_ROOT;
  const previousMaxBytes = process.env.JZOOM_UPLOAD_MAX_BYTES;
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "jzoom-upload-test-"));
    process.env.JZOOM_UPLOAD_ROOT = root;
    process.env.JZOOM_UPLOAD_MAX_BYTES = "12";
  });

  afterEach(async () => {
    process.env.JZOOM_UPLOAD_ROOT = previousRoot;
    process.env.JZOOM_UPLOAD_MAX_BYTES = previousMaxBytes;
    await rm(root, { force: true, recursive: true });
  });

  it("stores request files with sanitized names, hashes, and readable content", async () => {
    const service = new FileStorageService();
    const buffer = Buffer.from("contract");

    const stored = await service.storeRequestFile("request-1", "client-documents", {
      buffer,
      mimetype: "application/pdf",
      originalname: "../contract?.pdf",
      size: buffer.length,
    });

    expect(stored).toEqual(
      expect.objectContaining({
        mimeType: "application/pdf",
        originalName: "contract_.pdf",
        sha256: createHash("sha256").update(buffer).digest("hex"),
        sizeBytes: buffer.length,
        storageProvider: "local",
      }),
    );
    expect(stored.storageKey).toContain("requests/request-1/client-documents/");

    await expect(streamToBuffer(await service.readableFile(stored.storageKey))).resolves.toEqual(
      buffer,
    );
  });

  it("preserves Arabic letters in sanitized file names", async () => {
    const service = new FileStorageService();
    const buffer = Buffer.from("arabic");

    const stored = await service.storeRequestFile("request-2", "attachments", {
      buffer,
      mimetype: "application/pdf",
      originalname: "\u0645\u0633\u062a\u0646\u062f?.pdf",
      size: buffer.length,
    });

    expect(stored.originalName).toBe("\u0645\u0633\u062a\u0646\u062f_.pdf");
    await expect(streamToBuffer(await service.readableFile(stored.storageKey))).resolves.toEqual(
      buffer,
    );
  });

  it("rejects empty, oversized, missing, and unsafe file reads", async () => {
    const service = new FileStorageService();

    await expect(
      service.storeRequestFile("request-1", "attachments", {
        buffer: Buffer.alloc(0),
        mimetype: "text/plain",
        originalname: "empty.txt",
        size: 0,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.storeRequestFile("request-1", "attachments", {
        buffer: Buffer.from("this file is too large"),
        mimetype: "text/plain",
        originalname: "large.txt",
        size: 22,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(service.readableFile("../outside.txt")).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(service.readableFile("requests/request-1/missing.txt")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
