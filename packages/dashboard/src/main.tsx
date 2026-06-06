import "./index.css";
import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { resolveDashboardSource } from "./resolve-dashboard-source";

const source = resolveDashboardSource(new URLSearchParams(window.location.search));

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App source={source} />
  </React.StrictMode>,
);
