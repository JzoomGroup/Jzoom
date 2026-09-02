import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import {
  UatImpersonationBanner,
  UatImpersonationProvider,
  UatUserSwitcherTrigger,
} from "./uat-user-switcher";
import { loadUatImpersonationUsers, loadUatSession } from "../lib/uat-impersonation-client";

jest.mock("../lib/uat-impersonation-client", () => ({
  loadUatImpersonationUsers: jest.fn(),
  loadUatSession: jest.fn(),
  startUatImpersonation: jest.fn(),
  stopUatImpersonation: jest.fn(),
}));

const mockedLoadSession = jest.mocked(loadUatSession);
const mockedLoadUsers = jest.mocked(loadUatImpersonationUsers);

const admin = {
  id: "admin-1",
  email: "info@jzoom.sa",
  displayName: "UAT Admin",
  preferredLocale: "ar",
  userType: "INTERNAL" as const,
  mustChangePassword: false,
  roles: ["ROLE-ADMIN"],
  permissions: ["PERM-MANAGE-USERS"],
  capabilities: { uatUserSwitcher: true },
  impersonation: null,
};

const users = [
  {
    id: "client-1",
    email: "staging.qa.client@jzoom.sa",
    displayName: "عميل UAT التجريبي",
    userType: "EXTERNAL" as const,
    roles: [{ code: "ROLE-CLIENT", name: "Client" }],
    clients: [{ id: "company-1", code: "UAT-001", name: "شركة الاختبار" }],
    lastLoginAt: null,
  },
  {
    id: "specialist-1",
    email: "demo.specialist@jzoom.sa",
    displayName: "مختص UAT",
    userType: "INTERNAL" as const,
    roles: [{ code: "ROLE-SPECIALIST", name: "Specialist" }],
    clients: [],
    lastLoginAt: "2026-09-01T10:00:00.000Z",
  },
];

function renderTools() {
  return render(
    <UatImpersonationProvider locale="ar">
      <UatUserSwitcherTrigger />
      <UatImpersonationBanner />
    </UatImpersonationProvider>,
  );
}

describe("UAT user switcher", () => {
  beforeEach(() => {
    mockedLoadSession.mockReset();
    mockedLoadUsers.mockReset();
  });

  it("opens a searchable modal only when the API enables the UAT capability", async () => {
    mockedLoadSession.mockResolvedValue(admin);
    mockedLoadUsers.mockResolvedValue(users);
    renderTools();

    const trigger = await screen.findByRole("button", { name: "اختبار: UAT Admin" });
    fireEvent.click(trigger);
    expect(await screen.findByRole("heading", { name: "اختيار مستخدم للاختبار" })).toBeVisible();
    const userList = document.querySelector<HTMLElement>(".uat-switcher-user-list");
    expect(userList).not.toBeNull();
    expect(within(userList!).getByText("عميل UAT التجريبي")).toBeVisible();
    expect(within(userList!).getByText("مختص UAT")).toBeVisible();

    fireEvent.change(screen.getByLabelText("البحث عن مستخدم"), {
      target: { value: "شركة الاختبار" },
    });
    await waitFor(() => expect(within(userList!).queryByText("مختص UAT")).not.toBeInTheDocument());
    expect(within(userList!).getByText("عميل UAT التجريبي")).toBeVisible();
    expect(screen.getByText("1 مستخدم")).toBeVisible();
  });

  it("does not render the switcher when the API capability is disabled", async () => {
    mockedLoadSession.mockResolvedValue({ ...admin, capabilities: { uatUserSwitcher: false } });
    renderTools();

    await waitFor(() => expect(mockedLoadSession).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole("button", { name: /اختبار:/ })).not.toBeInTheDocument();
  });

  it("keeps a return-to-Admin banner visible throughout impersonation", async () => {
    mockedLoadSession.mockResolvedValue({
      ...admin,
      id: "specialist-1",
      email: "demo.specialist@jzoom.sa",
      displayName: "مختص UAT",
      roles: ["ROLE-SPECIALIST"],
      permissions: [],
      capabilities: { uatUserSwitcher: false },
      impersonation: {
        active: true,
        admin: { id: admin.id, email: admin.email, displayName: admin.displayName },
      },
    });
    renderTools();

    expect(await screen.findByText("أنت تختبر الآن النظام بصلاحيات مختص UAT.")).toBeVisible();
    expect(screen.getByRole("button", { name: "العودة إلى حساب الأدمن" })).toBeVisible();
    expect(screen.queryByRole("button", { name: /اختبار:/ })).not.toBeInTheDocument();
  });
});
