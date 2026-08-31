import { BadRequestException } from "@nestjs/common";
import { jest } from "@jest/globals";
import { AuthService } from "../src/auth/auth.service.js";

describe("AuthService password changes", () => {
  const metadata = {
    ipAddress: "127.0.0.1",
    requestId: "request-1",
    userAgent: "jest",
  };

  function setup(passwordChangedAt: Date | null) {
    const prisma = {
      user: {
        findUnique: jest
          .fn<
            () => Promise<{
              passwordChangedAt: Date | null;
              passwordHash: string;
            } | null>
          >()
          .mockResolvedValue({
            passwordChangedAt,
            passwordHash: "encoded-current-password",
          }),
        update: jest.fn<() => Promise<unknown>>().mockResolvedValue({}),
      },
    };
    const passwords = {
      hash: jest.fn<() => Promise<string>>().mockResolvedValue("encoded-new-password"),
      verify: jest.fn<() => Promise<boolean>>(),
    };
    const audit = {
      record: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    };
    const service = new AuthService(
      { prisma } as never,
      {} as never,
      passwords as never,
      {} as never,
      audit as never,
      {} as never,
    );

    return { audit, passwords, prisma, service };
  }

  it("rejects an incorrect current password for an established account", async () => {
    const { passwords, prisma, service } = setup(new Date("2026-08-01T00:00:00.000Z"));
    passwords.verify.mockResolvedValueOnce(false);

    const error = await service
      .changePassword("user-1", "WrongPass123", "UpdatedPass456", "UpdatedPass456", metadata)
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(BadRequestException);
    expect((error as BadRequestException).getResponse()).toEqual(
      expect.objectContaining({ code: "CURRENT_PASSWORD_INVALID" }),
    );
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("changes an established account password after verifying the current password", async () => {
    const { audit, passwords, prisma, service } = setup(new Date("2026-08-01T00:00:00.000Z"));
    passwords.verify.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

    await service.changePassword(
      "user-1",
      "CurrentPass123",
      "UpdatedPass456",
      "UpdatedPass456",
      metadata,
    );

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: expect.objectContaining({
        failedLoginCount: 0,
        lockedUntil: null,
        passwordHash: "encoded-new-password",
      }),
    });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ eventCode: "AUTH_PASSWORD_CHANGED" }),
      metadata,
    );
  });

  it("keeps first-login password replacement compatible with temporary passwords", async () => {
    const { passwords, prisma, service } = setup(null);
    passwords.verify.mockResolvedValueOnce(false);

    await service.changePassword(
      "user-1",
      undefined,
      "FirstLoginPass123",
      "FirstLoginPass123",
      metadata,
    );

    expect(prisma.user.update).toHaveBeenCalledTimes(1);
  });
});
