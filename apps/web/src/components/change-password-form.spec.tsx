import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ChangePasswordForm } from "./change-password-form";
import { AuthApiError, changePassword } from "../lib/auth-client";

const replaceMock = jest.fn();
const refreshMock = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock, refresh: refreshMock }),
}));

jest.mock("../lib/auth-client", () => {
  class MockAuthApiError extends Error {
    constructor(
      message: string,
      readonly status: number,
      readonly body: { code?: string; message?: string },
    ) {
      super(message);
      this.name = "AuthApiError";
    }
  }

  return {
    AuthApiError: MockAuthApiError,
    changePassword: jest.fn(),
  };
});

describe("ChangePasswordForm", () => {
  beforeEach(() => {
    replaceMock.mockReset();
    refreshMock.mockReset();
    jest.mocked(changePassword).mockReset();
  });

  it("changes an established account password from the Arabic account screen", async () => {
    jest.mocked(changePassword).mockResolvedValue({ user: { roles: ["ROLE-CLIENT"] } });
    render(<ChangePasswordForm locale="ar" redirectOnSuccess={false} requireCurrentPassword />);

    fireEvent.change(screen.getByLabelText("كلمة المرور الحالية"), {
      target: { value: "CurrentPass123" },
    });
    fireEvent.change(screen.getByLabelText("كلمة المرور الجديدة"), {
      target: { value: "UpdatedPass456" },
    });
    fireEvent.change(screen.getByLabelText("تأكيد كلمة المرور"), {
      target: { value: "UpdatedPass456" },
    });
    fireEvent.click(screen.getByRole("button", { name: "تغيير كلمة المرور" }));

    await waitFor(() =>
      expect(changePassword).toHaveBeenCalledWith({
        currentPassword: "CurrentPass123",
        newPassword: "UpdatedPass456",
        confirmPassword: "UpdatedPass456",
      }),
    );
    expect(screen.getByRole("status")).toHaveTextContent("تم تغيير كلمة المرور بنجاح.");
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("shows a specific Arabic error for an incorrect current password", async () => {
    jest.mocked(changePassword).mockRejectedValue(
      new AuthApiError("Invalid current password", 400, {
        code: "CURRENT_PASSWORD_INVALID",
      }),
    );
    render(<ChangePasswordForm locale="ar" redirectOnSuccess={false} requireCurrentPassword />);

    fireEvent.change(screen.getByLabelText("كلمة المرور الحالية"), {
      target: { value: "WrongPass123" },
    });
    fireEvent.change(screen.getByLabelText("كلمة المرور الجديدة"), {
      target: { value: "UpdatedPass456" },
    });
    fireEvent.change(screen.getByLabelText("تأكيد كلمة المرور"), {
      target: { value: "UpdatedPass456" },
    });
    fireEvent.click(screen.getByRole("button", { name: "تغيير كلمة المرور" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("كلمة المرور الحالية غير صحيحة.");
  });
});
