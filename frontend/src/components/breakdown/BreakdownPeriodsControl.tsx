import { useEffect, useRef, useState } from "react";

import {
    type BreakdownPeriodYear,
    breakdownPeriodYears,
    formatBreakdownMonthName,
    hiddenPeriodCount,
    initialExpandedYears,
    toggleHiddenMonth,
    toggleHiddenYear,
    yearVisibility,
} from "./breakdownPeriods";

interface BreakdownPeriodsControlProps {
    months: string[];
    hiddenMonths: string[];
    onHiddenMonthsChange: (hiddenMonths: string[]) => void;
}

export default function BreakdownPeriodsControl({
    months,
    hiddenMonths,
    onHiddenMonthsChange,
}: BreakdownPeriodsControlProps): JSX.Element {
    const rootRef = useRef<HTMLDivElement | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const hiddenCount = hiddenPeriodCount(months, hiddenMonths);

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
                {hiddenCount === 0 ? "Periods" : `Periods · ${hiddenCount} hidden`}
            </button>
            {isOpen ? (
                <BreakdownPeriodsMenu
                    months={months}
                    hiddenMonths={hiddenMonths}
                    onHiddenMonthsChange={onHiddenMonthsChange}
                />
            ) : null}
        </div>
    );
}

interface BreakdownPeriodsMenuProps {
    months: string[];
    hiddenMonths: string[];
    onHiddenMonthsChange: (hiddenMonths: string[]) => void;
}

function BreakdownPeriodsMenu({ months, hiddenMonths, onHiddenMonthsChange }: BreakdownPeriodsMenuProps): JSX.Element {
    const years = breakdownPeriodYears(months);
    const [expandedYears, setExpandedYears] = useState<string[]>(() => initialExpandedYears(years, hiddenMonths));
    const hiddenCount = hiddenPeriodCount(months, hiddenMonths);

    function handleToggleExpandedYear(year: string): void {
        setExpandedYears((current) =>
            current.includes(year) ? current.filter((expandedYear) => expandedYear !== year) : [...current, year],
        );
    }

    return (
        <div
            role="dialog"
            aria-label="Visible periods"
            className="absolute right-0 z-20 mt-1.5 w-72 rounded-md border border-slate-200 bg-white p-2 shadow-lg"
        >
            <div className="mb-1 flex items-center justify-between gap-2 px-1.5">
                <div className="text-[11px] font-semibold text-slate-500">Visible periods</div>
                <button
                    type="button"
                    onClick={(): void => onHiddenMonthsChange([])}
                    disabled={hiddenCount === 0}
                    className="rounded px-1.5 py-0.5 text-[11px] font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    Reset
                </button>
            </div>
            <div className="flex max-h-80 flex-col gap-1 overflow-auto">
                {years.map((year) => {
                    const expanded = expandedYears.includes(year.year);
                    return (
                        <div key={year.year}>
                            <BreakdownPeriodYearHeader
                                year={year}
                                hiddenMonths={hiddenMonths}
                                expanded={expanded}
                                onToggleExpanded={(): void => handleToggleExpandedYear(year.year)}
                                onHiddenMonthsChange={onHiddenMonthsChange}
                            />
                            {expanded ? (
                                <BreakdownPeriodMonths
                                    months={year.months}
                                    hiddenMonths={hiddenMonths}
                                    onHiddenMonthsChange={onHiddenMonthsChange}
                                />
                            ) : null}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

interface BreakdownPeriodYearHeaderProps {
    year: BreakdownPeriodYear;
    hiddenMonths: string[];
    expanded: boolean;
    onToggleExpanded: () => void;
    onHiddenMonthsChange: (hiddenMonths: string[]) => void;
}

function BreakdownPeriodYearHeader({
    year,
    hiddenMonths,
    expanded,
    onToggleExpanded,
    onHiddenMonthsChange,
}: BreakdownPeriodYearHeaderProps): JSX.Element {
    const visibility = yearVisibility(year.months, hiddenMonths);

    return (
        <div className="flex items-center gap-1 rounded px-1.5 py-1 hover:bg-slate-50">
            <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-sm text-slate-800">
                <VisibilityCheckbox
                    checked={visibility === "visible"}
                    indeterminate={visibility === "partial"}
                    onChange={(): void => onHiddenMonthsChange(toggleHiddenYear(hiddenMonths, year.months))}
                />
                <span>{year.year}</span>
            </label>
            <button
                type="button"
                aria-expanded={expanded}
                aria-label={expanded ? `Collapse ${year.year}` : `Expand ${year.year}`}
                onClick={onToggleExpanded}
                className="h-6 w-6 rounded text-slate-500 transition hover:bg-slate-100"
            >
                {expanded ? "▾" : "▸"}
            </button>
        </div>
    );
}

interface BreakdownPeriodMonthsProps {
    months: string[];
    hiddenMonths: string[];
    onHiddenMonthsChange: (hiddenMonths: string[]) => void;
}

function BreakdownPeriodMonths({
    months,
    hiddenMonths,
    onHiddenMonthsChange,
}: BreakdownPeriodMonthsProps): JSX.Element {
    return (
        <div className="grid grid-cols-4 gap-1 px-1.5 pb-1 pl-7">
            {months.map((month) => (
                <label
                    key={month}
                    className="flex cursor-pointer items-center gap-1.5 rounded px-1 py-1 text-xs text-slate-700 hover:bg-slate-50"
                >
                    <VisibilityCheckbox
                        checked={!hiddenMonths.includes(month)}
                        onChange={(): void => onHiddenMonthsChange(toggleHiddenMonth(hiddenMonths, month))}
                    />
                    <span>{formatBreakdownMonthName(month)}</span>
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
