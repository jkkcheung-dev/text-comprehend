import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { createFixtureSource } from "./data/create-fixture-source";
import { loadDashboardData } from "./data/load-dashboard-data";

const readFixture = createFixtureSource("dashboard-workspace");

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App loadData={() => loadDashboardData(readFixture)} />
  </React.StrictMode>,
);
