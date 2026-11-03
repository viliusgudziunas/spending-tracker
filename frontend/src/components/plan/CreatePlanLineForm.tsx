import { type FormEvent, useState } from "react";

interface CreatePlanLineFormProps {
    sectionName: string;
    isPending: boolean;
    isCreatePending: boolean;
    onSubmit: (name: string) => void;
    onCancel: () => void;
}

export default function CreatePlanLineForm({
    sectionName,
    isPending,
    isCreatePending,
    onSubmit,
    onCancel,
}: CreatePlanLineFormProps): JSX.Element {
    const [name, setName] = useState("");

    function handleSubmit(event: FormEvent): void {
        event.preventDefault();
        onSubmit(name);
    }

    return (
        <form onSubmit={handleSubmit} className="mt-2 flex flex-wrap items-center gap-2">
            <input
                autoFocus
                value={name}
                onChange={(event): void => setName(event.target.value)}
                disabled={isPending}
                aria-label={`New row in ${sectionName}`}
                placeholder="New row name"
                className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
            />
            <button
                type="submit"
                disabled={name.trim() === "" || isPending}
                className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
                {isCreatePending ? "Adding..." : "Add row"}
            </button>
            <button
                type="button"
                onClick={onCancel}
                disabled={isCreatePending}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
                Cancel
            </button>
        </form>
    );
}
