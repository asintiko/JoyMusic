import { RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import { Providers } from "./providers";
import { createQueryClient } from "./query-client";
import { router } from "./router";

const queryClient = createQueryClient();
const container = document.getElementById("root");
if (!container) throw new Error("Root element is missing");

createRoot(container).render(
  <StrictMode>
    <Providers client={queryClient}>
      <RouterProvider router={router} />
    </Providers>
  </StrictMode>,
);
