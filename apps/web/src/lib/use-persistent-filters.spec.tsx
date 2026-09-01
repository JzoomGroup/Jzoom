import { act, renderHook, waitFor } from "@testing-library/react";
import { usePersistentFilters } from "./use-persistent-filters";

describe("usePersistentFilters", () => {
  beforeEach(() => window.sessionStorage.clear());

  it("restores list filters when the user returns", async () => {
    window.sessionStorage.setItem(
      "jzoom:test-filters",
      JSON.stringify({ query: "finance", status: "ACTIVE" }),
    );
    const { result } = renderHook(() =>
      usePersistentFilters("jzoom:test-filters", { query: "", status: "ALL" }),
    );

    await waitFor(() => expect(result.current.restored).toBe(true));
    expect(result.current.filters).toEqual({ query: "finance", status: "ACTIVE" });

    act(() => result.current.setFilters((current) => ({ ...current, query: "hr" })));
    await waitFor(() =>
      expect(JSON.parse(window.sessionStorage.getItem("jzoom:test-filters") ?? "{}")).toEqual({
        query: "hr",
        status: "ACTIVE",
      }),
    );
  });
});
