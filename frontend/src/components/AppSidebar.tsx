import { Link, useMatchRoute } from "@tanstack/react-router";
import { useReportsQuery } from "../hooks/useReportsQueries";

interface AppSidebarProps {
    collapsed: boolean;
    onToggle: () => void;
}

export default function AppSidebar({ collapsed, onToggle }: AppSidebarProps): JSX.Element {
    const { data: reports, isLoading, isError } = useReportsQuery();
    const matchRoute = useMatchRoute();

    if (collapsed) {
        return (
            <aside className="sticky top-4 flex h-fit flex-col items-center rounded-xl border border-slate-200 bg-white py-3 shadow-sm">
                <button
                    type="button"
                    onClick={onToggle}
                    className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                >
                    <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <polyline points="6 3 11 8 6 13" />
                    </svg>
                </button>
            </aside>
        );
    }

    return (
        <aside className="sticky top-4 flex h-fit flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
                <h2 className="m-0 text-lg font-semibold text-slate-900">Reports</h2>
                <div className="flex items-center gap-1.5">
                    <Link
                        to="/upload"
                        className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white no-underline transition hover:bg-blue-700"
                    >
                        New Upload
                    </Link>
                    <button
                        type="button"
                        onClick={onToggle}
                        className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                    >
                        <svg
                            width="16"
                            height="16"
                            viewBox="0 0 16 16"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <polyline points="10 3 5 8 10 13" />
                        </svg>
                    </button>
                </div>
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
