import usePlanSectionsState from "../../hooks/usePlanSectionsState";
import CreateSectionForm from "./CreateSectionForm";
import SectionRow from "./SectionRow";

export default function PlanPage(): JSX.Element {
    const {
        sections,
        isLoading,
        isError,
        newName,
        setNewName,
        newIsIncome,
        setNewIsIncome,
        editingId,
        editedName,
        setEditedName,
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
    } = usePlanSectionsState();

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
                            <SectionRow
                                key={section.id}
                                section={section}
                                isFirst={index === 0}
                                isLast={index === sections.length - 1}
                                isEditing={editingId === section.id}
                                editedName={editedName}
                                isUpdatePending={isUpdatePending}
                                isDeletePending={isDeletePending}
                                onEditedNameChange={setEditedName}
                                onCancelEditing={cancelEditing}
                                onStartEditing={handleStartEditing}
                                onRename={handleRename}
                                onMove={handleMove}
                                onDelete={handleDelete}
                            />
                        ))}
                    </ol>
                )}

                <CreateSectionForm
                    name={newName}
                    isIncome={newIsIncome}
                    isPending={isCreatePending}
                    onNameChange={setNewName}
                    onIsIncomeChange={setNewIsIncome}
                    onSubmit={handleCreate}
                />
            </section>
        </main>
    );
}
