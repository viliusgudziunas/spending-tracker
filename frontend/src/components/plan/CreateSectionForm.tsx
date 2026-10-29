import { type FormEvent, useState } from "react";

import { type CreatePlanSectionPayload } from "@/clients/backendClient/types";

interface CreateSectionFormProps {
    isPending: boolean;
    onSubmit: (payload: CreatePlanSectionPayload) => Promise<void>;
    onCancel: () => void;
}

export default function CreateSectionForm({ isPending, onSubmit, onCancel }: CreateSectionFormProps): JSX.Element {
    const [name, setName] = useState("");
    const [isIncome, setIsIncome] = useState(false);

    function handleSubmit(event: FormEvent): void {
        event.preventDefault();
        void onSubmit({ name, isIncome });
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-3 border-t border-slate-200 pt-4">
            <input
                autoFocus
                disabled={isPending}
                type="text"
                value={name}
                onChange={(event): void => setName(event.target.value)}
                placeholder="New section name"
                aria-label="New section name"
                className="min-w-56 flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
            />
            <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                    disabled={isPending}
                    type="checkbox"
                    checked={isIncome}
                    onChange={(event): void => setIsIncome(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300"
                />
                Income section
            </label>
            <button
                type="submit"
                disabled={name.trim() === "" || isPending}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
                {isPending ? "Adding..." : "Add section"}
            </button>
            <button
                type="button"
                onClick={onCancel}
                disabled={isPending}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
                Cancel
            </button>
        </form>
    );
}
