import { useState } from "react";
import Landing from "./pages/Landing";
import FleepitApp from "./pages/FleepitApp";
import Alerts from "./pages/Alerts";

export default function App() {
  const [view, setView] = useState("landing"); // landing | app | alerts

  const goLanding = () => setView("landing");
  const goApp = () => setView("app");
  const goAlerts = () => setView("alerts");

  if (view === "landing") return <Landing onLaunch={goApp} />;
  if (view === "alerts") return <Alerts onHome={goLanding} onNavApp={goApp} onNavAlerts={goAlerts} />;
  return <FleepitApp onHome={goLanding} onNavAlerts={goAlerts} />;
}
