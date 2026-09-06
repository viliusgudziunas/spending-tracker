import { createFileRoute } from "@tanstack/react-router";

import PlanPage from "@/components/plan/PlanPage";

export const Route = createFileRoute("/_app/plan")({
    component: PlanRoute,
});

function PlanRoute(): JSX.Element {
    return <PlanPage />;
}
