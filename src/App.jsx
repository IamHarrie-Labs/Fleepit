import { useState } from "react";
import Landing from "./pages/Landing";
import FleepitApp from "./pages/FleepitApp";
import Alerts from "./pages/Alerts";
import Docs from "./pages/Docs";

export default function App() {
  const [view, setView] = useState("landing"); // landing | app | alerts | docs

  const goLanding = () => setView("landing");
  const goApp = () => setView("app");
  const goAlerts = () => setView("alerts");
  const goDocs = () => setView("docs");

  if (view === "landing") return <Landing onLaunch={goApp} />;
  if (view === "alerts") return <Alerts onHome={goLanding} onNavApp={goApp} onNavAlerts={goAlerts} onNavDocs={goDocs} />;
  if (view === "docs") return <Docs onHome={goLanding} onNavApp={goApp} onNavAlerts={goAlerts} onNavDocs={goDocs} />;
  return <FleepitApp onHome={goLanding} onNavAlerts={goAlerts} onNavDocs={goDocs} />;
}
