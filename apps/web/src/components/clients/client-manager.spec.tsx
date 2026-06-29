import { fireEvent, render, screen } from "@testing-library/react";
import type { ClientsSnapshot } from "../../lib/clients-types";
import { ClientManager } from "./client-manager";

function snapshot(): ClientsSnapshot {
  return {
    clients: [
      {
        id: "client-1",
        code: "ACME",
        name: "Acme Logistics",
        legalName: "Acme Logistics LLC",
        commercialRegistration: "1010101010",
        sector: "Logistics",
        city: "Riyadh",
        employeesCount: 84,
        branchesCount: 5,
        transactionVolume: "High",
        operationalComplexity: "Medium",
        dataReadiness: "Ready",
        urgency: "Normal",
        billingContact: "billing@acme.test",
        authorizedApprover: "Mona Saleh",
        status: "ACTIVE",
        archivedAt: null,
        createdAt: "2026-06-01T00:00:00.000Z",
        updatedAt: "2026-06-22T00:00:00.000Z",
        counts: {
          assignments: 2,
          contacts: 3,
          quotes: 4,
          requests: 7,
        },
        users: [
          {
            id: "user-1",
            displayName: "Acme Client User",
            email: "client@acme.test",
            roleCode: "CLIENT",
            status: "ACTIVE",
            startsAt: "2026-06-01T00:00:00.000Z",
            endsAt: null,
          },
        ],
      },
    ],
  };
}

describe("ClientManager", () => {
  it("renders the premium client administration center with client cards", () => {
    render(<ClientManager initialSnapshot={snapshot()} locale="en" />);

    expect(screen.getByRole("heading", { level: 1, name: "Clients" })).toBeInTheDocument();
    expect(screen.getByText("Client administration center")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Acme Logistics" })).toBeInTheDocument();
    expect(screen.getByText("Acme Logistics LLC")).toBeInTheDocument();
    expect(screen.getByText("client@acme.test")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Portal user" })).toBeInTheDocument();
  });

  it("routes new client creation through pricing and opens portal-user forms locally", () => {
    render(<ClientManager initialSnapshot={snapshot()} locale="en" />);

    expect(screen.getByRole("link", { name: "New client" })).toHaveAttribute(
      "href",
      "/pricing?newClient=1",
    );

    fireEvent.click(screen.getByRole("button", { name: "Portal user" }));

    expect(
      screen.getByRole("heading", { level: 2, name: "Create portal user for Acme Logistics" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Portal user guardrails")).toBeInTheDocument();
    expect(
      screen.getByText("This user receives client access only within this client scope."),
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue("acme@client.jzoom.local")).toBeInTheDocument();
  });
});
