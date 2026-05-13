import React from "react";
import { createRoot } from "react-dom/client";
import App from "./app/App";
import { QuickAddApp } from "./app/components/QuickAddApp";
import "./styles/index.css";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Failed to find the root element");

const isQuickAdd = new URLSearchParams(window.location.search).get("quickadd") === "1";

createRoot(rootElement).render(
  <React.StrictMode>
    {isQuickAdd ? <QuickAddApp /> : <App />}
  </React.StrictMode>,
);
  