import { type FormEvent } from "react";

interface CreateSectionFormProps {
    name: string;
    isIncome: boolean;
    isPending: boolean;
    onNameChange: (name: string) => void;
    onIsIncomeChange: (isIncome: boolean) => void;
    onSubmit: (event: FormEvent) => Promise<void>;
}

export default function CreateSectionForm({
    name,
    isIncome,
    isPending,
    onNameChange,
    onIsIncomeChange,
    onSubmit,
}: CreateSectionFormProps): JSX.Element {
    return (
        <form
            onSubmit={(event): void => void onSubmit(event)}
            className="flex flex-wrap items-center gap-3 border-t border-slate-200 pt-4"
        >
            <input
                type="text"
                value={name}
                onChange={(event): void => onNameChange(event.target.value)}
                placeholder="New section name"
                aria-label="New section name"
                className="min-w-56 flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
            />
            <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                    type="checkbox"
                    checked={isIncome}
                    onChange={(event): void => onIsIncomeChange(event.target.checked)}
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
        </form>
    );
}
