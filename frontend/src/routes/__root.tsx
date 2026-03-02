import { Outlet, createRootRoute } from "@tanstack/react-router";
import { ModalProvider } from "../contexts/ModalContext";
import { ReportsProvider } from "../contexts/ReportsContext";
import { RulesProvider } from "../contexts/RulesContext";

export const Route = createRootRoute({
    component: RootComponent,
});

function RootComponent(): JSX.Element {
    return (
        <ReportsProvider>
            <RulesProvider>
                <ModalProvider>
                    <Outlet />
                </ModalProvider>
            </RulesProvider>
        </ReportsProvider>
    );
}
