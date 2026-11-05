import { useState } from "react";

import { type PlanGrid } from "@/clients/backendClient/responseParsers";
import { useIsPlanPending } from "@/hooks/usePlanQueries";
import usePlanSectionsState from "@/hooks/usePlanSectionsState";
import { getInitialPlanMonthRange, type PlanMonthRange } from "@/shared/utils/planMonthRange";

import CreateSectionForm from "./CreateSectionForm";
import PlanMonthRangeForm from "./PlanMonthRangeForm";
import PlanSectionLines from "./PlanSectionLines";
import RenameSectionForm from "./RenameSectionForm";
import SectionRow from "./SectionRow";

export default function PlanPage(): JSX.Element {
    const [range, setRange] = useState(() => getInitialPlanMonthRange(new Date()));
    const isPending = useIsPlanPending();

    return (
        <main className="flex min-w-0 flex-col gap-4">
            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h1 className="m-0 text-2xl font-semibold text-slate-900">Plan</h1>
                <p className="mb-0 mt-1 text-sm text-slate-500">
                    Arrange sections in the order money should flow through your monthly plan.
                </p>
                <PlanMonthRangeForm range={range} isPending={isPending} onApply={setRange} />
            </section>
            <PlanSections range={range} />
        </main>
    );
}

function PlanSections({ range }: { range: PlanMonthRange }): JSX.Element | null {
    const {
        plan: fetchedPlan,
        isLoading,
        isError,
        isFetching,
        retryPlan,
        isCreatingSection,
        startCreatingSection,
        cancelCreatingSection,
        editingId,
        cancelEditing,
        mutationError,
        isCreatePending,
        isUpdatePending,
        isDeletePending,
        handleCreate,
        handleStartEditing,
        handleRename,
        handleMove,
        handleDelete,
    } = usePlanSectionsState(range);
    const [lastPlan, setLastPlan] = useState<PlanGrid>();
    if (fetchedPlan !== undefined && fetchedPlan !== lastPlan) {
        setLastPlan(fetchedPlan);
    }
    const plan = fetchedPlan ?? lastPlan;

    if (isLoading && plan === undefined) {
        return (
            <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
                <p className="m-0 text-sm text-slate-400">Loading plan...</p>
            </div>
        );
    }

    const loadError = isError ? (
        <div role="alert" className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            <p className="m-0">
                {plan === undefined
                    ? "Failed to load plan."
                    : "Failed to load the selected months. Showing the last loaded range."}
            </p>
            <button
                type="button"
                onClick={retryPlan}
                disabled={isFetching}
                className="mt-2 rounded-md border border-red-300 px-3 py-1.5 font-medium disabled:opacity-50"
            >
                Retry
            </button>
        </div>
    ) : null;

    if (plan === undefined) return loadError;

    const { sections, months } = plan;

    return (
        <>
            {loadError}
            {mutationError !== null ? (
                <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
                    {mutationError.message}
                </div>
            ) : null}

            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="m-0 text-lg font-semibold text-slate-900">Sections</h2>

                {sections.length === 0 ? (
                    <p className="my-5 text-sm text-slate-400">No plan sections yet.</p>
                ) : (
                    <div
                        className="@container/plan my-5 overflow-x-auto rounded-lg border border-slate-200"
                        role="region"
                        aria-label="Plan amounts"
                        tabIndex={0}
                    >
                        <div
                            className="grid min-w-max"
                            style={{ gridTemplateColumns: `minmax(20rem, 1fr) repeat(${months.length}, 10rem)` }}
                        >
                            <div className="col-span-full grid grid-cols-subgrid border-b border-slate-200 bg-slate-100 text-sm font-semibold text-slate-700">
                                <span className="@xl/plan:sticky left-0 z-10 bg-slate-100 px-3 py-3">Name</span>
                                {months.map((month) => (
                                    <time
                                        key={month}
                                        dateTime={month}
                                        className="border-l border-slate-200 px-3 py-3 text-right"
                                    >
                                        {month}
                                    </time>
                                ))}
                            </div>
                            <ol className="col-span-full m-0 grid grid-cols-subgrid list-none p-0">
                                {sections.map((section, index) => (
                                    <li key={section.id} className="col-span-full grid grid-cols-subgrid">
                                        <div className="col-span-full grid grid-cols-subgrid border-y border-slate-200 bg-slate-50">
                                            <div className="@xl/plan:sticky left-0 z-10 flex min-h-12 flex-wrap items-center gap-3 bg-slate-50 px-3 py-2">
                                                <span className="w-6 shrink-0 text-center text-xs font-medium text-slate-400">
                                                    {section.position}
                                                </span>
                                                {editingId === section.id ? (
                                                    <RenameSectionForm
                                                        section={section}
                                                        isPending={isUpdatePending}
                                                        onSubmit={(name) => handleRename(section, name)}
                                                        onCancel={cancelEditing}
                                                    />
                                                ) : (
                                                    <SectionRow
                                                        section={section}
                                                        isFirst={index === 0}
                                                        isLast={index === sections.length - 1}
                                                        isUpdatePending={isUpdatePending}
                                                        isDeletePending={isDeletePending}
                                                        onStartEditing={handleStartEditing}
                                                        onMove={handleMove}
                                                        onDelete={handleDelete}
                                                    />
                                                )}
                                            </div>
                                        </div>
                                        <PlanSectionLines section={section} months={months} />
                                    </li>
                                ))}
                            </ol>
                        </div>
                    </div>
                )}

                {isCreatingSection ? (
                    <CreateSectionForm
                        isPending={isCreatePending}
                        onSubmit={handleCreate}
                        onCancel={cancelCreatingSection}
                    />
                ) : (
                    <button
                        type="button"
                        onClick={startCreatingSection}
                        className="rounded-md px-2 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50"
                    >
                        + Add section
                    </button>
                )}
            </section>
        </>
    );
}
