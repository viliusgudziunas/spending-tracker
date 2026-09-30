import { createFileRoute } from "@tanstack/react-router";

import BreakdownPage from "@/components/breakdown/BreakdownPage";

export const Route = createFileRoute("/_app/breakdown")({
    component: BreakdownRoute,
});

function BreakdownRoute(): JSX.Element {
    return <BreakdownPage />;
}
