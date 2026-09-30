import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app";
import { bootBridge } from "./bridge/boot";
import { preloadTopics } from "./lib/topics";
import "./styles.css";

async function start() {
  const container = document.getElementById("root");
  if (!container) return;
  try {
    await bootBridge();
    await preloadTopics();
  } catch (error) {
    container.textContent = error instanceof Error ? error.message : "Bridge unavailable";
    return;
  }
  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void start();
