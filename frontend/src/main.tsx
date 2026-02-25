import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Log unhandled promise rejections without suppressing them
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  // Don't prevent default - let React error boundary handle it
});

createRoot(document.getElementById("root")!).render(<App />);
