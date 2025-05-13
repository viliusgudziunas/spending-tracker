import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { ModalProvider } from "./contexts/ModalContext.tsx";
import { ReportsProvider } from "./contexts/ReportsContext.tsx";
import { RulesProvider } from "./contexts/RulesContext.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <ReportsProvider>
            <RulesProvider>
                <ModalProvider>
                    <App />
                </ModalProvider>
            </RulesProvider>
        </ReportsProvider>
    </StrictMode>
);
