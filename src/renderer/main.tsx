import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { LanguageProvider } from "@/i18n/LanguageProvider";
import { sessionPersistence } from "@/stores/session-persistence";
import "./styles/global.css";

// Boot the persistence layer — lives outside React, runs for the app lifetime.
sessionPersistence.start();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </StrictMode>,
);
