import { createFileRoute } from "@tanstack/react-router";
import ReportUploadPage from "../components/ReportUploadPage";
import { AppShell } from "./_app";

export const Route = createFileRoute("/")({
    component: IndexRoute,
});

function IndexRoute(): JSX.Element {
    return (
        <AppShell>
            <ReportUploadPage />
        </AppShell>
    );
}
