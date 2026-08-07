import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { householdsOverHttp } from "./households-over-http";
import "./index.css";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");

createRoot(root).render(
  <StrictMode>
    <App households={householdsOverHttp} />
  </StrictMode>,
);
