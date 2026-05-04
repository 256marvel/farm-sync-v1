import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { installAutoSync } from "./lib/offline-queue";

// Wire offline-queue auto-sync as early as possible so queued worker logs
// are pushed the instant the device reconnects — even before any page mounts.
installAutoSync();

createRoot(document.getElementById("root")!).render(<App />);

