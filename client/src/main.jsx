import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import Dashboard from "./Dashboard.jsx";
import Grid from "./Grid.jsx";
import Results from "./Results.jsx";
import "./styles.css";

function Router() {
  const path = window.location.pathname;
  if (path === "/dashboard") {
    return <Dashboard />;
  }
  if (path === "/grid") {
    return <Grid />;
  }
  if (path === "/results") {
    return <Results />;
  }
  return <App />;
}

createRoot(document.getElementById("root")).render(<Router />);
