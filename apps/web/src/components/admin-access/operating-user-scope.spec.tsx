import type { CreateOperatingUserPayload } from "../../lib/admin-access-client";
import { emptyOperatingUserForm, scopePayloadFromForm, toggleValue } from "./operating-user-scope";

function populatedForm(): CreateOperatingUserPayload {
  return {
    ...emptyOperatingUserForm(),
    clientIds: ["client-1"],
    monthlyServiceIds: ["monthly-1"],
    oneTimeServiceIds: ["one-time-1"],
    serviceItemIds: ["item-1"],
    specialistIds: ["specialist-1"],
    supervisorId: "supervisor-1",
  };
}

describe("operating user scope mapping", () => {
  it("keeps monthly and one-time routing for monthly specialists", () => {
    expect(scopePayloadFromForm(populatedForm(), "ROLE-SPECIALIST")).toEqual({
      clientIds: ["client-1"],
      monthlyServiceIds: ["monthly-1"],
      oneTimeServiceIds: ["one-time-1"],
      serviceItemIds: ["item-1"],
      specialistIds: [],
      supervisorId: "supervisor-1",
    });
  });

  it("keeps only project routing for project specialists", () => {
    expect(scopePayloadFromForm(populatedForm(), "ROLE-PROJECT-SPECIALIST")).toEqual({
      clientIds: ["client-1"],
      monthlyServiceIds: [],
      oneTimeServiceIds: ["one-time-1"],
      serviceItemIds: [],
      specialistIds: [],
      supervisorId: "supervisor-1",
    });
  });

  it("keeps supervised specialists but strips service scopes from supervisors", () => {
    expect(scopePayloadFromForm(populatedForm(), "ROLE-SUPERVISOR")).toEqual({
      clientIds: ["client-1"],
      monthlyServiceIds: [],
      oneTimeServiceIds: [],
      serviceItemIds: [],
      specialistIds: ["specialist-1"],
    });
  });

  it("toggles scope values without mutating the source", () => {
    const original = ["client-1"];
    expect(toggleValue(original, "client-2")).toEqual(["client-1", "client-2"]);
    expect(toggleValue(original, "client-1")).toEqual([]);
    expect(original).toEqual(["client-1"]);
  });
});
