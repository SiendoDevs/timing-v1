import React from "react";
import Dashboard from "./Dashboard";
import Grid from "./Grid";
import Results from "./Results";
import VotePage from "./VotePage";
import VotingOverlay from "./VotingOverlay";
import LiveTiming from "./LiveTiming";

export default function App() {
  // Simple routing
  const pathname = window.location.pathname;
  const isDashboard = pathname === "/dashboard";
  const isGrid = pathname === "/grid";
  const isResults = pathname === "/results";
  const isVote = pathname === "/vote";
  const isVotingOverlay = pathname === "/voting-overlay";

  if (isDashboard) return <Dashboard />;
  if (isGrid) return <Grid />;
  if (isResults) return <Results />;
  if (isVote) return <VotePage />;
  if (isVotingOverlay) return <VotingOverlay />;

  return <LiveTiming />;
}
