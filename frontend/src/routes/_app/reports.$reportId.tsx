import { createFileRoute } from "@tanstack/react-router";
import ReportDetailPage from "../../components/ReportDetailPage";

export const Route = createFileRoute("/_app/reports/$reportId")({
    component: ReportDetailRoute,
});

function ReportDetailRoute(): JSX.Element {
    const { reportId } = Route.useParams();
    return <ReportDetailPage reportId={reportId} />;
}
