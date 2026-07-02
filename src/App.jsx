import { useState, useEffect, useCallback } from "react";
import Landing from "./pages/Landing";
import FleepitApp from "./pages/FleepitApp";
import Alerts from "./pages/Alerts";

// Real paths via the History API, no #hash. Kept as a plain lookup table
// rather than a router dependency since there are only three destinations.
const PATH_TO_VIEW = { "/": "landing", "/research": "app", "/alerts": "alerts" };
const VIEW_TO_PATH = { landing: "/", app: "/research", alerts: "/alerts" };
const viewFromPath = (pathname) => PATH_TO_VIEW[pathname] || "landing";

export default function App() {
  const [view, setView] = useState(() => viewFromPath(window.location.pathname));

  const navigate = useCallback((nextView) => {
    setView(nextView);
    const path = VIEW_TO_PATH[nextView] || "/";
    if (window.location.pathname !== path) {
      window.history.pushState({ view: nextView }, "", path);
    }
  }, []);

  // Back/forward browser buttons
  useEffect(() => {
    const onPopState = () => setView(viewFromPath(window.location.pathname));
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const goLanding = () => navigate("landing");
  const goApp = () => navigate("app");
  const goAlerts = () => navigate("alerts");

  if (view === "landing") return <Landing onLaunch={goApp} />;
  if (view === "alerts") return <Alerts onHome={goLanding} onNavApp={goApp} onNavAlerts={goAlerts} />;
  return <FleepitApp onHome={goLanding} onNavAlerts={goAlerts} />;
}
