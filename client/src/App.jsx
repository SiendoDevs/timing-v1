import React from "react";
import Dashboard from "./Dashboard";
import Grid from "./Grid";
import Results from "./Results";
import VotePage from "./VotePage";
import VotingOverlay from "./VotingOverlay";
import LiveTiming from "./LiveTiming";
import LandingPage from "./LandingPage";

export default function App() {
  // Simple routing
  const pathname = window.location.pathname;

  if (pathname === "/dashboard") return <Dashboard />;
  if (pathname === "/grid") return <Grid />;
  if (pathname === "/results") return <Results />;
  if (pathname === "/vote") return <VotePage />;
  if (pathname === "/voting-overlay") return <VotingOverlay />;
  if (pathname === "/livetiming") return <LiveTiming />;

  return <LandingPage />;
}
