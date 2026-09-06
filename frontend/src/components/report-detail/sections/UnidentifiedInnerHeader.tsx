import { type IHeaderParams } from "ag-grid-community";

import { type Transaction } from "@/clients/backendClient/responseParsers";

interface UnidentifiedInnerHeaderParams extends IHeaderParams<Transaction> {
    onOpenColumnsMenu?: () => void;
}

export default function UnidentifiedInnerHeader({
    displayName,
    onOpenColumnsMenu,
}: UnidentifiedInnerHeaderParams): JSX.Element {
    return (
        <div className="flex w-full items-center gap-1">
            <span className="min-w-0 flex-1 truncate">{displayName}</span>
            <button
                type="button"
                aria-label="Open columns menu"
                className="h-5 w-5 shrink-0 rounded text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                onClick={(event): void => {
                    event.stopPropagation();
                    onOpenColumnsMenu?.();
                }}
            >
                ⋮
            </button>
        </div>
    );
}
