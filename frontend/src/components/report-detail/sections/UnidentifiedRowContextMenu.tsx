import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Transaction } from "../../../clients/backendClient/responseParsers";
import { getContextMenuPosition } from "../contextMenu";

interface UnidentifiedRowContextMenuProps {
    transaction: Transaction;
    x: number;
    y: number;
    onClose: () => void;
    onCreateRuleFilter: (transaction: Transaction) => void;
    onCreateReportFilter: (transaction: Transaction) => void;
    onAddToRuleGroup: (transaction: Transaction) => void;
    onAddToReportFilter: (transaction: Transaction) => void;
}

export default function UnidentifiedRowContextMenu({
    transaction,
    x,
    y,
    onClose,
    onCreateRuleFilter,
    onCreateReportFilter,
    onAddToRuleGroup,
    onAddToReportFilter,
}: UnidentifiedRowContextMenuProps): JSX.Element {
    const contextMenuRef = useRef<HTMLDivElement | null>(null);
    const [position, setPosition] = useState<{ left: number; top: number }>({ left: x, top: y });

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

    useLayoutEffect(() => {
        const menu = contextMenuRef.current;
        if (menu === null) return;

        const rect = menu.getBoundingClientRect();
        setPosition(
            getContextMenuPosition({
                anchorX: x,
                anchorY: y,
                menuWidth: rect.width,
                menuHeight: rect.height,
                viewportWidth: window.innerWidth,
                viewportHeight: window.innerHeight,
            }),
        );
    }, [x, y]);

    return (
        <div
            ref={contextMenuRef}
            className="fixed z-50 min-w-[220px] rounded-md border border-slate-200 bg-white p-1 shadow-xl"
            style={{ left: position.left, top: position.top }}
        >
            <button
                type="button"
                className="block w-full rounded px-2 py-1.5 text-left text-xs text-slate-700 transition hover:bg-slate-50"
                onClick={(): void => {
                    onCreateRuleFilter(transaction);
                    onClose();
                }}
            >
                Create new rule
            </button>
            <button
                type="button"
                className="block w-full rounded px-2 py-1.5 text-left text-xs text-slate-700 transition hover:bg-slate-50"
                onClick={(): void => {
                    onAddToRuleGroup(transaction);
                    onClose();
                }}
            >
                Update existing rule
            </button>
            <button
                type="button"
                className="block w-full rounded px-2 py-1.5 text-left text-xs text-slate-700 transition hover:bg-slate-50"
                onClick={(): void => {
                    onCreateReportFilter(transaction);
                    onClose();
                }}
            >
                Create one-time rule
            </button>
            <button
                type="button"
                className="block w-full rounded px-2 py-1.5 text-left text-xs text-slate-700 transition hover:bg-slate-50"
                onClick={(): void => {
                    onAddToReportFilter(transaction);
                    onClose();
                }}
            >
                Assign to existing rule
            </button>
        </div>
    );
}
