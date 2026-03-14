import { useEffect, useRef } from "react";
import { Transaction } from "../../../clients/backendClient/responseParsers";

interface UnidentifiedRowContextMenuProps {
    transaction: Transaction;
    x: number;
    y: number;
    onClose: () => void;
    onCreateRuleFilter: (transaction: Transaction) => void;
    onCreateReportFilter: (transaction: Transaction) => void;
    onAddToRuleGroup: (transaction: Transaction) => void;
}

export default function UnidentifiedRowContextMenu({
    transaction,
    x,
    y,
    onClose,
    onCreateRuleFilter,
    onCreateReportFilter,
    onAddToRuleGroup,
}: UnidentifiedRowContextMenuProps): JSX.Element {
    const contextMenuRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const handleOutsideClick = (event: MouseEvent): void => {
            const target = event.target as Node;
            if (contextMenuRef.current?.contains(target)) return;
            onClose();
        };

        const handleEscape = (event: KeyboardEvent): void => {
            if (event.key !== "Escape") return;
            onClose();
        };

        window.addEventListener("mousedown", handleOutsideClick);
        window.addEventListener("keydown", handleEscape);
        return (): void => {
            window.removeEventListener("mousedown", handleOutsideClick);
            window.removeEventListener("keydown", handleEscape);
        };
    }, [onClose]);

    return (
        <div
            ref={contextMenuRef}
            className="fixed z-50 min-w-[220px] rounded-md border border-slate-200 bg-white p-1 shadow-xl"
            style={{ left: x, top: y }}
        >
            <button
                type="button"
                className="block w-full rounded px-2 py-1.5 text-left text-xs text-slate-700 transition hover:bg-slate-50"
                onClick={(): void => {
                    onCreateRuleFilter(transaction);
                    onClose();
                }}
            >
                Create rule filter
            </button>
            <button
                type="button"
                className="block w-full rounded px-2 py-1.5 text-left text-xs text-slate-700 transition hover:bg-slate-50"
                onClick={(): void => {
                    onCreateReportFilter(transaction);
                    onClose();
                }}
            >
                Create report filter
            </button>
            <button
                type="button"
                className="block w-full rounded px-2 py-1.5 text-left text-xs text-slate-700 transition hover:bg-slate-50"
                onClick={(): void => {
                    onAddToRuleGroup(transaction);
                    onClose();
                }}
            >
                Edit rule filter
            </button>
        </div>
    );
}
