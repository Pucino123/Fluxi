import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Prevent unhandled promise rejections from causing reloads
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  event.preventDefault();
});

// Prevent uncaught errors from causing reloads
window.addEventListener('error', (event) => {
  console.error('Uncaught error:', event.error);
  event.preventDefault();
});

createRoot(document.getElementById("root")!).render(<App />);
