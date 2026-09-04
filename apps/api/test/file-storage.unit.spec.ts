import { BadRequestException, NotFoundException } from "@nestjs/common";
import { jest } from "@jest/globals";
import { createHash } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FileStorageService } from "../src/requests/file-storage.service.js";
import type { RuntimePlatformSettingsService } from "../src/platform-configuration/runtime-platform-settings.service.js";

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
  const pdf = Buffer.from("%PDF-1.7");

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
    const buffer = pdf;

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
    const buffer = pdf;

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

  it("isolates request and project files even when their original names match", async () => {
    const service = new FileStorageService();
    const first = Buffer.from("request");
    const second = Buffer.from("project");

    const requestFile = await service.storeRequestFile("request-3", "outputs", {
      buffer: first,
      mimetype: "text/plain",
      originalname: "result.txt",
      size: first.length,
    });
    const projectFile = await service.storeProjectFile("project-3", "outputs", {
      buffer: second,
      mimetype: "text/plain",
      originalname: "result.txt",
      size: second.length,
    });

    expect(requestFile.storageKey).toMatch(/^requests\/request-3\/outputs\//);
    expect(projectFile.storageKey).toMatch(/^projects\/project-3\/outputs\//);
    expect(requestFile.storageKey).not.toBe(projectFile.storageKey);
    await expect(
      streamToBuffer(await service.readableFile(requestFile.storageKey)),
    ).resolves.toEqual(first);
    await expect(
      streamToBuffer(await service.readableFile(projectFile.storageKey)),
    ).resolves.toEqual(second);
  });

  it("uses the actual buffer size instead of trusting multipart metadata", async () => {
    const service = new FileStorageService();

    await expect(
      service.storeRequestFile("request-4", "attachments", {
        buffer: Buffer.from("larger than limit"),
        mimetype: "text/plain",
        originalname: "misreported.txt",
        size: 1,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    const stored = await service.storeRequestFile("request-4", "attachments", {
      buffer: Buffer.from("content"),
      mimetype: "text/plain",
      originalname: "size.txt",
      size: 1,
    });
    expect(stored.sizeBytes).toBe(Buffer.byteLength("content"));
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

  it("enforces MIME types configured by the Admin runtime setting", async () => {
    const settings = {
      number: jest.fn(async () => 1),
      stringArray: jest.fn(async () => ["application/pdf", "image/*"]),
    } as unknown as RuntimePlatformSettingsService;
    const service = new FileStorageService(settings);

    await expect(
      service.storeRequestFile("request-5", "attachments", {
        buffer: Buffer.from("script"),
        mimetype: "text/javascript",
        originalname: "script.js",
        size: 6,
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: "FILE_TYPE_NOT_ALLOWED" }),
    });

    await expect(
      service.storeRequestFile("request-5", "attachments", {
        buffer: pdf,
        mimetype: "application/pdf",
        originalname: "document.pdf",
        size: pdf.length,
      }),
    ).resolves.toEqual(expect.objectContaining({ mimeType: "application/pdf" }));
  });

  it("rejects files whose bytes do not match the declared MIME type", async () => {
    const service = new FileStorageService();

    await expect(
      service.storeRequestFile("request-6", "attachments", {
        buffer: Buffer.from("not-pdf"),
        mimetype: "application/pdf",
        originalname: "spoofed.pdf",
        size: 7,
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: "FILE_CONTENT_MISMATCH" }),
    });
  });

  it("rejects binary content disguised as an allowed text file", async () => {
    const service = new FileStorageService();
    const executable = Buffer.from("4d5a900003000000", "hex");

    await expect(
      service.storeRequestFile("request-7", "attachments", {
        buffer: executable,
        mimetype: "text/plain",
        originalname: "payload.txt",
        size: executable.length,
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: "FILE_CONTENT_MISMATCH" }),
    });
  });

  it("rejects a valid file signature when the extension is misleading", async () => {
    const service = new FileStorageService();

    await expect(
      service.storeRequestFile("request-8", "attachments", {
        buffer: pdf,
        mimetype: "application/pdf",
        originalname: "document.txt",
        size: pdf.length,
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: "FILE_CONTENT_MISMATCH" }),
    });
  });

  it("accepts safe extension aliases reported by file signature detection", async () => {
    process.env.JZOOM_UPLOAD_MAX_BYTES = "1024";
    const service = new FileStorageService();
    const jpeg = Buffer.from("ffd8ffe000104a4649460001", "hex");

    await expect(
      service.storeRequestFile("request-9", "attachments", {
        buffer: jpeg,
        mimetype: "image/jpeg",
        originalname: "photo.jpeg",
        size: jpeg.length,
      }),
    ).resolves.toEqual(
      expect.objectContaining({ mimeType: "image/jpeg", originalName: "photo.jpeg" }),
    );
  });
});
