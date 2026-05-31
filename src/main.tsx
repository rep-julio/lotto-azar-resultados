import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { squircle } from "ldrs";

squircle.register();

createRoot(document.getElementById("root")!).render(<App />);
