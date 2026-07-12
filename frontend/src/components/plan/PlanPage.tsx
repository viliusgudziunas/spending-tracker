import { FormEvent, useState } from "react";
import { PlanSection } from "../../clients/backendClient/responseParsers";
import {
    useCreatePlanSectionMutation,
    useDeletePlanSectionMutation,
    usePlanSectionsQuery,
    useUpdatePlanSectionMutation,
} from "../../hooks/usePlanQueries";

export default function PlanPage(): JSX.Element {
    const { data: sections, isLoading, isError } = usePlanSectionsQuery();
    const createMutation = useCreatePlanSectionMutation();
    const updateMutation = useUpdatePlanSectionMutation();
    const deleteMutation = useDeletePlanSectionMutation();
    const [newName, setNewName] = useState("");
    const [newIsIncome, setNewIsIncome] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editedName, setEditedName] = useState("");

    const resetMutationErrors = (): void => {
        if (createMutation.isError) createMutation.reset();
        if (updateMutation.isError) updateMutation.reset();
        if (deleteMutation.isError) deleteMutation.reset();
    };

    const handleCreate = async (event: FormEvent): Promise<void> => {
        event.preventDefault();
        const name = newName.trim();
        if (name === "") return;

        resetMutationErrors();
        try {
            await createMutation.mutateAsync({ name, isIncome: newIsIncome });
            setNewName("");
            setNewIsIncome(false);
        } catch {
            return;
        }
    };

    const handleStartEditing = (section: PlanSection): void => {
        resetMutationErrors();
        setEditingId(section.id);
        setEditedName(section.name);
    };

    const handleRename = async (event: FormEvent, section: PlanSection): Promise<void> => {
        event.preventDefault();
        const name = editedName.trim();
        if (name === "") return;
        if (name === section.name) {
            setEditingId(null);
            return;
        }

        resetMutationErrors();
        try {
            await updateMutation.mutateAsync({ sectionId: section.id, payload: { name } });
            setEditingId(null);
        } catch {
            return;
        }
    };

    const handleMove = (section: PlanSection, position: number): void => {
        resetMutationErrors();
        updateMutation.mutate({ sectionId: section.id, payload: { position } });
    };

    const handleDelete = (section: PlanSection): void => {
        if (window.confirm(`Delete plan section "${section.name}"?`)) {
            resetMutationErrors();
            deleteMutation.mutate(section.id);
        }
    };

    if (isLoading) {
        return (
            <main className="flex items-center justify-center rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
                <p className="m-0 text-sm text-slate-400">Loading plan...</p>
            </main>
        );
    }

    if (isError || sections === undefined) {
        return (
            <main className="flex items-center justify-center rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
                <p className="m-0 text-sm text-red-500">Failed to load plan.</p>
            </main>
        );
    }

    const mutationError = createMutation.error ?? updateMutation.error ?? deleteMutation.error;

    return (
        <main className="flex flex-col gap-4">
            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h1 className="m-0 text-2xl font-semibold text-slate-900">Plan</h1>
                <p className="mb-0 mt-1 text-sm text-slate-500">
                    Arrange sections in the order money should flow through your monthly plan.
                </p>
            </section>

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
                    <ol className="my-5 flex list-none flex-col gap-2 p-0">
                        {sections.map((section, index) => (
                            <li
                                key={section.id}
                                className="flex min-h-12 items-center gap-3 rounded-lg border border-slate-200 px-3 py-2"
                            >
                                <span className="w-6 shrink-0 text-center text-xs font-medium text-slate-400">
                                    {section.position}
                                </span>

                                {editingId === section.id ? (
                                    <form
                                        onSubmit={(event): void => void handleRename(event, section)}
                                        className="flex min-w-0 flex-1 items-center gap-2"
                                    >
                                        <input
                                            type="text"
                                            value={editedName}
                                            onChange={(event): void => setEditedName(event.target.value)}
                                            autoFocus
                                            aria-label={`Rename ${section.name}`}
                                            className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                                        />
                                        <button
                                            type="submit"
                                            disabled={editedName.trim() === "" || updateMutation.isPending}
                                            className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            Save
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(): void => setEditingId(null)}
                                            disabled={updateMutation.isPending}
                                            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                                        >
                                            Cancel
                                        </button>
                                    </form>
                                ) : (
                                    <>
                                        <div className="flex min-w-0 flex-1 items-center gap-2">
                                            <span className="truncate text-sm font-semibold text-slate-800">
                                                {section.name}
                                            </span>
                                            {section.isIncome ? (
                                                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                                                    Income
                                                </span>
                                            ) : null}
                                        </div>

                                        <div className="flex items-center gap-1">
                                            <button
                                                type="button"
                                                onClick={(): void => handleMove(section, section.position - 1)}
                                                disabled={index === 0 || updateMutation.isPending}
                                                aria-label={`Move ${section.name} up`}
                                                title="Move up"
                                                className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                                            >
                                                ↑
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(): void => handleMove(section, section.position + 1)}
                                                disabled={index === sections.length - 1 || updateMutation.isPending}
                                                aria-label={`Move ${section.name} down`}
                                                title="Move down"
                                                className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                                            >
                                                ↓
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(): void => handleStartEditing(section)}
                                                disabled={updateMutation.isPending || deleteMutation.isPending}
                                                aria-label={`Rename ${section.name}`}
                                                className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(): void => handleDelete(section)}
                                                disabled={deleteMutation.isPending || updateMutation.isPending}
                                                className="rounded-md border border-red-300 px-2 py-1 text-xs text-red-600 transition hover:bg-red-50 disabled:opacity-40"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </>
                                )}
                            </li>
                        ))}
                    </ol>
                )}

                <form
                    onSubmit={(event): void => void handleCreate(event)}
                    className="flex flex-wrap items-center gap-3 border-t border-slate-200 pt-4"
                >
                    <input
                        type="text"
                        value={newName}
                        onChange={(event): void => setNewName(event.target.value)}
                        placeholder="New section name"
                        aria-label="New section name"
                        className="min-w-56 flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                    />
                    <label className="flex items-center gap-2 text-sm text-slate-600">
                        <input
                            type="checkbox"
                            checked={newIsIncome}
                            onChange={(event): void => setNewIsIncome(event.target.checked)}
                            className="h-4 w-4 rounded border-slate-300"
                        />
                        Income section
                    </label>
                    <button
                        type="submit"
                        disabled={newName.trim() === "" || createMutation.isPending}
                        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {createMutation.isPending ? "Adding..." : "Add section"}
                    </button>
                </form>
            </section>
        </main>
    );
}
