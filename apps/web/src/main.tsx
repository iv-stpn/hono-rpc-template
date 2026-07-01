import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { Toaster } from "sonner";
import { Controls } from "./components/Controls";
import "./i18n";
import { router } from "./router";
import { useThemeStore } from "./store/themeStore";
import "./index.css";

const root = document.getElementById("root");
if (!root) throw new Error("Root element #root not found");

// Keeps the toast surface in sync with the active theme.
function App() {
  const theme = useThemeStore((s) => s.theme);
  return (
    <>
      <Controls />
      <RouterProvider router={router} />
      <Toaster
        theme={theme}
        position="bottom-right"
        toastOptions={{
          style: {
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            color: "var(--color-fg)",
          },
        }}
      />
    </>
  );
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
