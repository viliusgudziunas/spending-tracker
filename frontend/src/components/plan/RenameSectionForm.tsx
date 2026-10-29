import { type FormEvent, useState } from "react";

import { type PlanSection } from "@/clients/backendClient/responseParsers";

interface RenameSectionFormProps {
    section: PlanSection;
    isPending: boolean;
    onSubmit: (name: string) => Promise<void>;
    onCancel: () => void;
}

export default function RenameSectionForm({
    section,
    isPending,
    onSubmit,
    onCancel,
}: RenameSectionFormProps): JSX.Element {
    const [name, setName] = useState(section.name);

    function handleSubmit(event: FormEvent): void {
        event.preventDefault();
        void onSubmit(name);
    }

    return (
        <form onSubmit={handleSubmit} className="flex min-w-0 flex-1 items-center gap-2">
            <input
                type="text"
                value={name}
                onChange={(event): void => setName(event.target.value)}
                autoFocus
                aria-label={`Rename ${section.name}`}
                className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
            />
            <button
                type="submit"
                disabled={name.trim() === "" || isPending}
                className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
                Save
            </button>
            <button
                type="button"
                onClick={onCancel}
                disabled={isPending}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
                Cancel
            </button>
        </form>
    );
}
