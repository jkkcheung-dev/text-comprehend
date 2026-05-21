import type { DashboardSource } from "./types";

const FIXTURE_ROUTE_PREFIX = "/__text-comprehend-fixtures__";

export function createFixtureSource(fixtureName: string): DashboardSource {
  return {
    meta: {
      mode: "fixture",
      label: `Fixture: ${fixtureName}`,
      fixtureName,
    },
    read: async (path: string) => {
      const response = await fetch(`${FIXTURE_ROUTE_PREFIX}/${fixtureName}/${path}`);

      if (!response.ok) {
        throw new Error(`ENOENT: ${path}`);
      }

      return response.text();
    },
  };
}
