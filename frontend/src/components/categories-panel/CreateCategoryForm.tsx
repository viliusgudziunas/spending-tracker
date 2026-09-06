import { useCallback, useState } from "react";

import { useCreateCategoryMutation } from "@/hooks/useCategoryQueries";

export default function CreateCategoryForm(): JSX.Element {
    const [isOpen, setIsOpen] = useState(false);
    const [name, setName] = useState("");
    const createMutation = useCreateCategoryMutation();

    const handleSubmit = useCallback(
        async (event: React.FormEvent): Promise<void> => {
            event.preventDefault();
            if (name.trim() === "") return;
            await createMutation.mutateAsync({ name: name.trim() });
            setName("");
            setIsOpen(false);
        },
        [createMutation, name],
    );

    if (!isOpen) {
        return (
            <button
                type="button"
                onClick={(): void => setIsOpen(true)}
                className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-3 text-xs font-medium text-slate-500 transition hover:border-slate-400 hover:text-slate-700"
            >
                + New Category
            </button>
        );
    }

    return (
        <form
            onSubmit={(event): void => void handleSubmit(event)}
            className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
        >
            <input
                type="text"
                value={name}
                onChange={(event): void => setName(event.target.value)}
                placeholder="Category name"
                autoFocus
                className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
            />
            <div className="flex gap-2">
                <button
                    type="submit"
                    disabled={name.trim() === "" || createMutation.isPending}
                    className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {createMutation.isPending ? "Creating..." : "Create"}
                </button>
                <button
                    type="button"
                    onClick={(): void => {
                        setIsOpen(false);
                        setName("");
                    }}
                    className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                >
                    Cancel
                </button>
            </div>
        </form>
    );
}
