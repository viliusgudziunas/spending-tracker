import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, createRootRoute } from "@tanstack/react-router";
import { ModalProvider } from "../contexts/ModalContext";
import { ReportsProvider } from "../contexts/ReportsContext";
import { RulesProvider } from "../contexts/RulesContext";

const queryClient = new QueryClient();

export const Route = createRootRoute({
    component: RootComponent,
});

function RootComponent(): JSX.Element {
    return (
        <QueryClientProvider client={queryClient}>
            <ReportsProvider>
                <RulesProvider>
                    <ModalProvider>
                        <Outlet />
                    </ModalProvider>
                </RulesProvider>
            </ReportsProvider>
        </QueryClientProvider>
    );
}
