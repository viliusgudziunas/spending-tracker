import { Outlet, createFileRoute } from "@tanstack/react-router";
import AppSidebar from "../components/AppSidebar";

export const Route = createFileRoute("/_app")({
    component: AppLayout,
});

function AppLayout(): JSX.Element {
    return (
        <div className="min-h-screen bg-slate-100 p-5">
            <div className="mx-auto flex max-w-[1800px] gap-4">
                <div className="w-[300px] shrink-0">
                    <AppSidebar />
                </div>
                <div className="min-w-0 flex-1">
                    <Outlet />
                </div>
            </div>
        </div>
    );
}
