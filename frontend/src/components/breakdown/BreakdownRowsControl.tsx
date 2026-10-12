import { useEffect, useRef, useState } from "react";

import { type BreakdownCategory } from "@/clients/backendClient/responseParsers";

import {
    breakdownCategoryVisibility,
    hiddenBreakdownRowCount,
    initialExpandedBreakdownCategories,
    toggleHiddenBreakdownCategory,
    toggleHiddenBreakdownFilter,
} from "./breakdownRowVisibility";

export const HIDDEN_BREAKDOWN_ROWS_NOTE =
    "Category totals include hidden rows. The category row and Unidentified stay.";

interface BreakdownRowsControlProps {
    categories: BreakdownCategory[];
    hiddenFilterKeys: string[];
    onHiddenFilterKeysChange: (hiddenFilterKeys: string[]) => void;
}

export default function BreakdownRowsControl({
    categories,
    hiddenFilterKeys,
    onHiddenFilterKeysChange,
}: BreakdownRowsControlProps): JSX.Element {
    const rootRef = useRef<HTMLDivElement | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const hiddenCount = hiddenBreakdownRowCount(categories, hiddenFilterKeys);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        function handlePointerDown(event: MouseEvent): void {
            const target = event.target;
            if (!(target instanceof Node) || rootRef.current?.contains(target) === true) {
                return;
            }
            setIsOpen(false);
        }

        function handleKeyDown(event: KeyboardEvent): void {
            if (event.key !== "Escape") {
                return;
            }
            setIsOpen(false);
        }

        window.addEventListener("mousedown", handlePointerDown);
        window.addEventListener("keydown", handleKeyDown);
        return (): void => {
            window.removeEventListener("mousedown", handlePointerDown);
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [isOpen]);

    return (
        <div ref={rootRef} className="relative shrink-0">
            <button
                type="button"
                aria-expanded={isOpen}
                aria-haspopup="dialog"
                onClick={(): void => setIsOpen((open) => !open)}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
                {hiddenCount === 0 ? "Rows" : `Rows · ${hiddenCount} hidden`}
            </button>
            {isOpen ? (
                <BreakdownRowsMenu
                    categories={categories}
                    hiddenFilterKeys={hiddenFilterKeys}
                    hiddenCount={hiddenCount}
                    onHiddenFilterKeysChange={onHiddenFilterKeysChange}
                />
            ) : null}
        </div>
    );
}

interface BreakdownRowsMenuProps {
    categories: BreakdownCategory[];
    hiddenFilterKeys: string[];
    hiddenCount: number;
    onHiddenFilterKeysChange: (hiddenFilterKeys: string[]) => void;
}

function BreakdownRowsMenu({
    categories,
    hiddenFilterKeys,
    hiddenCount,
    onHiddenFilterKeysChange,
}: BreakdownRowsMenuProps): JSX.Element {
    const visibleCategories = categories.filter((category) => category.filters.length > 0);
    const [expandedCategoryIds, setExpandedCategoryIds] = useState<string[]>(() =>
        initialExpandedBreakdownCategories(categories, hiddenFilterKeys),
    );

    function handleToggleExpandedCategory(categoryId: string): void {
        setExpandedCategoryIds((current) =>
            current.includes(categoryId)
                ? current.filter((expandedCategoryId) => expandedCategoryId !== categoryId)
                : [...current, categoryId],
        );
    }

    return (
        <div
            role="dialog"
            aria-label="Visible rows"
            className="absolute right-0 z-20 mt-1.5 w-80 rounded-md border border-slate-200 bg-white p-2 shadow-lg"
        >
            <div className="mb-1 flex items-center justify-between gap-2 px-1.5">
                <div className="text-[11px] font-semibold text-slate-500">Visible rows</div>
                <button
                    type="button"
                    onClick={(): void => onHiddenFilterKeysChange([])}
                    disabled={hiddenCount === 0}
                    className="rounded px-1.5 py-0.5 text-[11px] font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    Reset
                </button>
            </div>
            <p className="mb-1 mt-0 px-1.5 text-[11px] leading-snug text-slate-500">{HIDDEN_BREAKDOWN_ROWS_NOTE}</p>
            {visibleCategories.length === 0 ? (
                <p className="m-0 px-1.5 py-1 text-sm text-slate-600">No rows to hide.</p>
            ) : (
                <div className="flex max-h-80 flex-col gap-1 overflow-auto">
                    {visibleCategories.map((category) => {
                        const expanded = expandedCategoryIds.includes(category.id);
                        return (
                            <div key={category.id}>
                                <BreakdownCategoryHeader
                                    category={category}
                                    hiddenFilterKeys={hiddenFilterKeys}
                                    expanded={expanded}
                                    onToggleExpanded={(): void => handleToggleExpandedCategory(category.id)}
                                    onHiddenFilterKeysChange={onHiddenFilterKeysChange}
                                />
                                {expanded ? (
                                    <BreakdownCategoryFilters
                                        category={category}
                                        hiddenFilterKeys={hiddenFilterKeys}
                                        onHiddenFilterKeysChange={onHiddenFilterKeysChange}
                                    />
                                ) : null}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

interface BreakdownCategoryHeaderProps {
    category: BreakdownCategory;
    hiddenFilterKeys: string[];
    expanded: boolean;
    onToggleExpanded: () => void;
    onHiddenFilterKeysChange: (hiddenFilterKeys: string[]) => void;
}

function BreakdownCategoryHeader({
    category,
    hiddenFilterKeys,
    expanded,
    onToggleExpanded,
    onHiddenFilterKeysChange,
}: BreakdownCategoryHeaderProps): JSX.Element {
    const filterKeys = category.filters.map((filter) => filter.key);
    const visibility = breakdownCategoryVisibility(filterKeys, hiddenFilterKeys);

    return (
        <div className="flex items-center gap-1 rounded px-1.5 py-1 hover:bg-slate-50">
            <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-sm text-slate-800">
                <VisibilityCheckbox
                    checked={visibility === "visible"}
                    indeterminate={visibility === "partial"}
                    onChange={(): void =>
                        onHiddenFilterKeysChange(toggleHiddenBreakdownCategory(hiddenFilterKeys, filterKeys))
                    }
                />
                <span className="min-w-0 truncate" title={category.name}>
                    {category.name}
                </span>
                <span className="shrink-0 text-[10px] font-normal text-slate-500">filters</span>
            </label>
            <button
                type="button"
                aria-expanded={expanded}
                aria-label={expanded ? `Collapse ${category.name}` : `Expand ${category.name}`}
                onClick={onToggleExpanded}
                className="h-6 w-6 shrink-0 rounded text-slate-500 transition hover:bg-slate-100"
            >
                {expanded ? "▾" : "▸"}
            </button>
        </div>
    );
}

interface BreakdownCategoryFiltersProps {
    category: BreakdownCategory;
    hiddenFilterKeys: string[];
    onHiddenFilterKeysChange: (hiddenFilterKeys: string[]) => void;
}

function BreakdownCategoryFilters({
    category,
    hiddenFilterKeys,
    onHiddenFilterKeysChange,
}: BreakdownCategoryFiltersProps): JSX.Element {
    return (
        <div className="flex flex-col gap-0.5 px-1.5 pb-1 pl-7">
            {category.filters.map((filter) => (
                <label
                    key={filter.key}
                    className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-xs text-slate-700 hover:bg-slate-50"
                >
                    <VisibilityCheckbox
                        checked={!hiddenFilterKeys.includes(filter.key)}
                        onChange={(): void =>
                            onHiddenFilterKeysChange(toggleHiddenBreakdownFilter(hiddenFilterKeys, filter.key))
                        }
                    />
                    <span className="truncate" title={filter.name}>
                        {filter.name}
                    </span>
                </label>
            ))}
        </div>
    );
}

interface VisibilityCheckboxProps {
    checked: boolean;
    indeterminate?: boolean;
    onChange: () => void;
}

function VisibilityCheckbox({ checked, indeterminate = false, onChange }: VisibilityCheckboxProps): JSX.Element {
    const inputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        if (inputRef.current === null) {
            return;
        }
        inputRef.current.indeterminate = indeterminate;
    }, [indeterminate]);

    return <input ref={inputRef} type="checkbox" checked={checked} onChange={onChange} />;
}
