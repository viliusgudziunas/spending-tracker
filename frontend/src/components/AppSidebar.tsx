import { Link, useMatchRoute } from "@tanstack/react-router";
import { useReportsQuery } from "../services/reports/queries";

export default function AppSidebar(): JSX.Element {
    const { data: reports, isLoading, isError } = useReportsQuery();
    const matchRoute = useMatchRoute();

    return (
        <aside className="sticky top-4 flex h-fit flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
                <h2 className="m-0 text-lg font-semibold text-slate-900">Reports</h2>
                <Link
                    to="/upload"
                    className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white no-underline transition hover:bg-blue-700"
                >
                    New Upload
                </Link>
            </div>

            {isLoading ? <p className="m-0 text-xs text-slate-400">Loading reports...</p> : null}

            {isError ? <p className="m-0 text-xs text-red-500">Failed to load reports.</p> : null}

            {reports !== undefined && reports.length === 0 ? (
                <p className="m-0 text-xs text-slate-400">No reports yet.</p>
            ) : null}

            {reports !== undefined && reports.length > 0 ? (
                <ul className="m-0 flex list-none flex-col gap-1 p-0">
                    {reports.map((report) => {
                        const isActive = matchRoute({ to: "/reports/$reportId", params: { reportId: report.id } });
                        return (
                            <li key={report.id}>
                                <Link
                                    to="/reports/$reportId"
                                    params={{ reportId: report.id }}
                                    className={`block rounded-md px-3 py-2 text-xs font-medium no-underline transition ${
                                        isActive
                                            ? "bg-blue-50 text-blue-700"
                                            : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                                    }`}
                                >
                                    {report.name}
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            ) : null}
        </aside>
    );
}
