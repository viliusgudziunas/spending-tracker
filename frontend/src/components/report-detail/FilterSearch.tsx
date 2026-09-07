import { useMemo, useState } from "react";

export interface FilterSearchOption {
    id: string;
    name: string;
    categoryId: string;
    categoryName: string;
    descriptionRuleValues: string[];
}

interface FilterSearchProps {
    options: FilterSearchOption[];
    disabled?: boolean;
    onPick: (pick: { categoryId: string; filterId: string }) => void;
}

function includesIgnoreCase(value: string, query: string): boolean {
    return value.toLowerCase().includes(query.toLowerCase());
}

function optionMatches(option: FilterSearchOption, query: string): boolean {
    if (includesIgnoreCase(option.name, query)) return true;
    return option.descriptionRuleValues.some((value) => includesIgnoreCase(value, query));
}

function matchingDescriptionRule(option: FilterSearchOption, query: string): string | undefined {
    return option.descriptionRuleValues.find((value) => includesIgnoreCase(value, query));
}

export default function FilterSearch({ options, disabled = false, onPick }: FilterSearchProps): JSX.Element {
    const [query, setQuery] = useState("");
    const trimmedQuery = query.trim();
    const matches = useMemo(() => {
        if (trimmedQuery === "") return [];
        return options.filter((option) => optionMatches(option, trimmedQuery));
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
                    placeholder="Type a filter name or description value"
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
                            No matching filters. Choose a category below, or try another search.
                        </li>
                    ) : (
                        matches.map((option, index) => {
                            const nameMatched = includesIgnoreCase(option.name, trimmedQuery);
                            const hittingRule = nameMatched ? undefined : matchingDescriptionRule(option, trimmedQuery);
                            return (
                                <li key={option.id}>
                                    <button
                                        type="button"
                                        onClick={(): void => handlePickOption(option)}
                                        className={`flex w-full items-baseline justify-between gap-2 px-2.5 py-1.5 text-left transition hover:bg-slate-50 ${index === 0 ? "bg-slate-50" : ""}`}
                                    >
                                        <span className="flex min-w-0 flex-col">
                                            <span className="truncate text-sm font-normal text-slate-900">
                                                {option.name}
                                            </span>
                                            {hittingRule !== undefined ? (
                                                <span className="truncate text-[11px] text-slate-500">
                                                    {hittingRule}
                                                </span>
                                            ) : null}
                                        </span>
                                        <span className="shrink-0 text-[11px] text-slate-400">
                                            {option.categoryName}
                                        </span>
                                    </button>
                                </li>
                            );
                        })
                    )}
                </ul>
            ) : null}
        </div>
    );
}
