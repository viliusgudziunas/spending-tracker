import { createFileRoute } from "@tanstack/react-router";
import ReportUploadPage from "../../components/ReportUploadPage";

export const Route = createFileRoute("/_app/upload")({
    component: UploadRoute,
});

function UploadRoute(): JSX.Element {
    return <ReportUploadPage />;
}
