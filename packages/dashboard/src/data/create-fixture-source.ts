import type { DashboardReader } from "./types";

const FIXTURE_ROUTE_PREFIX = "/__text-comprehend-fixtures__";

export function createFixtureSource(fixtureName: string): DashboardReader {
  return async (path: string) => {
    const response = await fetch(`${FIXTURE_ROUTE_PREFIX}/${fixtureName}/${path}`);

    if (!response.ok) {
      throw new Error(`ENOENT: ${path}`);
    }

    return response.text();
  };
}
