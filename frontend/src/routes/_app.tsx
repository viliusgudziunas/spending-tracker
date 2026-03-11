import { Outlet, createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import AppSidebar from "../components/AppSidebar";

export const Route = createFileRoute("/_app")({
    component: AppLayout,
});

const REPORTS_LIST_COLLAPSED_STORAGE_KEY = "app:reports-list:collapsed";

function AppLayout(): JSX.Element {
    const [collapsed, setCollapsed] = useState<boolean>(() => {
        if (typeof window === "undefined") return false;
        return window.localStorage.getItem(REPORTS_LIST_COLLAPSED_STORAGE_KEY) === "true";
    });

    useEffect(() => {
        if (typeof window === "undefined") return;
        window.localStorage.setItem(REPORTS_LIST_COLLAPSED_STORAGE_KEY, String(collapsed));
    }, [collapsed]);

    return (
        <div className="min-h-screen bg-slate-100 p-5">
            <div className="mx-auto flex max-w-[1800px] gap-4">
                <div className={`shrink-0 transition-all duration-200 ${collapsed ? "w-10" : "w-[300px]"}`}>
                    <AppSidebar collapsed={collapsed} onToggle={(): void => setCollapsed((prev) => !prev)} />
                </div>
                <div className="min-w-0 flex-1">
                    <Outlet />
                </div>
            </div>
        </div>
    );
}
