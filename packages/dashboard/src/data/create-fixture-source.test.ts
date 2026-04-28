import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fixture-backed dashboard bootstrap wiring", () => {
  it("reads fixture artifacts from the Vite fixture route", async () => {
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => "fixture contents",
    });

    vi.stubGlobal("fetch", fetch);

    const { createFixtureSource } = await import("./create-fixture-source");
    const read = createFixtureSource("dashboard-workspace");

    await expect(read(".text-comprehend/knowledge-graph.json")).resolves.toBe("fixture contents");
    expect(fetch).toHaveBeenCalledWith(
      "/__text-comprehend-fixtures__/dashboard-workspace/.text-comprehend/knowledge-graph.json",
    );
  });

  it("surfaces the requested artifact path when a fixture read fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: "Not Found",
      }),
    );

    const { createFixtureSource } = await import("./create-fixture-source");
    const read = createFixtureSource("dashboard-workspace");

    await expect(read(".text-comprehend/missing.json")).rejects.toThrow(
      "ENOENT: .text-comprehend/missing.json",
    );
  });

  it("defines a Vite config for serving checked-in fixtures", async () => {
    const { default: config } = await import("../../vite.config");
    const plugins = "plugins" in config && Array.isArray(config.plugins) ? config.plugins : [];

    expect(plugins).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: "dashboard-fixtures" })]),
    );
  });
});
