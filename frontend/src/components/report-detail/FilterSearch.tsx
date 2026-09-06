import { useMemo, useState } from "react";

export interface FilterSearchOption {
    id: string;
    name: string;
    categoryId: string;
    categoryName: string;
}

interface FilterSearchProps {
    options: FilterSearchOption[];
    disabled?: boolean;
    onPick: (pick: { categoryId: string; filterId: string }) => void;
}

function filterNameMatches(name: string, query: string): boolean {
    return name.toLowerCase().includes(query.toLowerCase());
}

export default function FilterSearch({ options, disabled = false, onPick }: FilterSearchProps): JSX.Element {
    const [query, setQuery] = useState("");
    const trimmedQuery = query.trim();
    const matches = useMemo(() => {
        if (trimmedQuery === "") return [];
        return options.filter((option) => filterNameMatches(option.name, trimmedQuery));
    }, [options, trimmedQuery]);

    function handlePickOption(option: FilterSearchOption): void {
        onPick({ categoryId: option.categoryId, filterId: option.id });
        setQuery("");
    }

    return (
        <div className="flex flex-col gap-1">
            <label className="flex flex-col gap-1 text-xs font-semibold text-slate-700">
                Search filters
                <input
                    type="search"
                    value={query}
                    onChange={(event): void => setQuery(event.target.value)}
                    onKeyDown={(event): void => {
                        if (event.key !== "Enter") return;
                        const firstMatch = matches[0];
                        if (firstMatch === undefined) return;
                        event.preventDefault();
                        handlePickOption(firstMatch);
                    }}
                    placeholder="Type a filter name"
                    disabled={disabled}
                    className="rounded-md border border-slate-300 px-2.5 py-1.5 text-sm font-normal text-slate-900 outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-400 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                />
            </label>
            {trimmedQuery === "" && !disabled ? (
                <p className="text-[11px] font-normal text-slate-400">Or choose a category below</p>
            ) : null}
            {trimmedQuery !== "" ? (
                <ul className="max-h-40 overflow-y-auto rounded-md border border-slate-200 bg-white">
                    {matches.length === 0 ? (
                        <li className="px-2.5 py-1.5 text-xs text-slate-500">
                            No filter names match. Choose a category below, or try another name.
                        </li>
                    ) : (
                        matches.map((option, index) => (
                            <li key={option.id}>
                                <button
                                    type="button"
                                    onClick={(): void => handlePickOption(option)}
                                    className={`flex w-full items-baseline justify-between gap-2 px-2.5 py-1.5 text-left transition hover:bg-slate-50 ${index === 0 ? "bg-slate-50" : ""}`}
                                >
                                    <span className="truncate text-sm font-normal text-slate-900">{option.name}</span>
                                    <span className="shrink-0 text-[11px] text-slate-400">{option.categoryName}</span>
                                </button>
                            </li>
                        ))
                    )}
                </ul>
            ) : null}
        </div>
    );
}
