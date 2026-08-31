import { firstQueryValue, replaceCurrentUrlQuery } from "./url-state";

describe("URL-backed list state", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/requests/queues?keep=1");
  });

  it("normalizes server search parameters", () => {
    expect(firstQueryValue("  value  ")).toBe("value");
    expect(firstQueryValue(["first", "second"])).toBe("first");
    expect(firstQueryValue(undefined)).toBe("");
  });

  it("replaces owned filters while preserving unrelated query state", () => {
    replaceCurrentUrlQuery({ queue: "specialist", status: "IN_PROGRESS", priority: undefined }, [
      "queue",
      "status",
      "priority",
    ]);

    const url = new URL(window.location.href);
    expect(url.searchParams.get("keep")).toBe("1");
    expect(url.searchParams.get("queue")).toBe("specialist");
    expect(url.searchParams.get("status")).toBe("IN_PROGRESS");
    expect(url.searchParams.has("priority")).toBe(false);
  });
});
