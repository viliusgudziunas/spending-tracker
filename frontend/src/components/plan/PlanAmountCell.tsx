import { type ReactNode, useRef, useState } from "react";

import { type PlanGridLine } from "@/clients/backendClient/responseParsers";
import { useDeletePlanValueMutation, useSetPlanValueMutation } from "@/hooks/usePlanQueries";
import { parsePlanAmountInput, serializePlanAmount } from "@/shared/utils/planAmounts";

const EUR_FORMAT = new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" });

interface PlanAmountCellProps {
    sectionId: string;
    lineId: string;
    label: string;
    month: string;
    cell: PlanGridLine["amounts"][string];
    disabled: boolean;
}

export default function PlanAmountCell(props: PlanAmountCellProps): JSX.Element {
    const [isEditing, setIsEditing] = useState(false);

    return (
        <div
            data-override={props.cell.isOverride}
            className="group/plan-amount relative flex flex-col justify-center border-l border-slate-100 px-3 py-2 tabular-nums data-[override=true]:bg-blue-50/50"
        >
            {props.cell.isOverride ? <PlanOverrideMarker /> : null}
            {isEditing ? (
                <EditPlanAmount {...props} onClose={() => setIsEditing(false)} />
            ) : (
                <PlanAmountDisplay
                    key={props.cell.isOverride ? "override" : "default"}
                    {...props}
                    onEdit={() => setIsEditing(true)}
                />
            )}
        </div>
    );
}

function PlanAmountDisplay({
    sectionId,
    lineId,
    label,
    month,
    cell,
    disabled,
    onEdit,
}: PlanAmountCellProps & { onEdit: () => void }): JSX.Element {
    const deleteMutation = useDeletePlanValueMutation(sectionId);
    const submitting = useRef(false);
    const isDisabled = disabled || deleteMutation.isPending || deleteMutation.isSuccess;

    function revert(): void {
        if (isDisabled || submitting.current) return;
        submitting.current = true;
        deleteMutation.mutate(
            { lineId, month },
            {
                onError: () => {
                    submitting.current = false;
                },
            },
        );
    }

    return (
        <>
            <div className="relative flex min-h-6 items-center pl-6">
                <PlanAmountButton label={label} amountCents={cell.amountCents} disabled={isDisabled} onEdit={onEdit} />
                {cell.isOverride ? (
                    <PlanOverrideActions label={label} disabled={isDisabled} onRevert={revert}>
                        {deleteMutation.isPending ? "…" : "↶"}
                    </PlanOverrideActions>
                ) : null}
            </div>
            {deleteMutation.error !== null ? <PlanAmountError message={deleteMutation.error.message} /> : null}
            {deleteMutation.isSuccess && cell.isOverride ? <PlanRevertNotice /> : null}
        </>
    );
}

function PlanAmountButton({
    label,
    amountCents,
    disabled,
    onEdit,
}: {
    label: string;
    amountCents: number | null;
    disabled: boolean;
    onEdit: () => void;
}): JSX.Element {
    return (
        <button
            type="button"
            aria-label={`Edit ${label}`}
            disabled={disabled}
            onClick={onEdit}
            className="w-full whitespace-nowrap rounded text-right hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed"
        >
            {amountCents === null ? "—" : EUR_FORMAT.format(amountCents / 100)}
        </button>
    );
}

function PlanOverrideMarker(): JSX.Element {
    return (
        <span title="Monthly override" className="absolute right-1 top-1 size-1.5 rounded-full bg-blue-400">
            <span className="sr-only">Monthly override</span>
        </span>
    );
}

function PlanOverrideActions({
    label,
    disabled,
    onRevert,
    children,
}: {
    label: string;
    disabled: boolean;
    onRevert: () => void;
    children: ReactNode;
}): JSX.Element {
    return (
        <button
            type="button"
            aria-label={`Revert ${label} to default`}
            title="Revert to default"
            disabled={disabled}
            onClick={onRevert}
            className="absolute left-0 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded text-base text-blue-600 transition-opacity hover:bg-blue-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:text-blue-300 [@media(hover:hover)_and_(pointer:fine)]:opacity-0 group-hover/plan-amount:opacity-100 group-focus-within/plan-amount:opacity-100"
        >
            <span aria-hidden="true">{children}</span>
        </button>
    );
}

function PlanAmountError({ message }: { message: string }): JSX.Element {
    return (
        <p role="alert" className="m-0 mt-1 text-xs text-red-600">
            {message}
        </p>
    );
}

function PlanRevertNotice(): JSX.Element {
    return (
        <p role="status" className="m-0 mt-1 text-xs text-slate-600">
            Reverted. Use Retry above to refresh.
        </p>
    );
}

function EditPlanAmount({
    sectionId,
    lineId,
    label,
    month,
    cell,
    disabled,
    onClose,
}: PlanAmountCellProps & { onClose: () => void }): JSX.Element {
    const [draft, setDraft] = useState(() => serializePlanAmount(cell.amountCents) ?? "");
    const [changed, setChanged] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const submitting = useRef(false);
    const lastAttempt = useRef<string>();
    const saveMutation = useSetPlanValueMutation(sectionId);
    const deleteMutation = useDeletePlanValueMutation(sectionId);
    const isPending = disabled || saveMutation.isPending || deleteMutation.isPending;

    function save(fromBlur: boolean): void {
        if (submitting.current || isPending || (fromBlur && lastAttempt.current === draft)) return;
        lastAttempt.current = draft;
        setError(null);

        let amountCents: number | null;
        try {
            amountCents = parsePlanAmountInput(draft);
        } catch (error: unknown) {
            setError(error instanceof Error ? error.message : "Enter a valid monthly amount.");
            return;
        }

        submitting.current = true;
        if (!changed || (amountCents === null && !cell.isOverride)) {
            onClose();
            return;
        }

        const callbacks = {
            onSuccess: onClose,
            onError: (error: Error): void => {
                submitting.current = false;
                setError(error.message);
            },
        };
        if (amountCents === null) {
            deleteMutation.mutate({ lineId, month }, callbacks);
        } else {
            saveMutation.mutate({ lineId, month, payload: { amountCents } }, callbacks);
        }
    }

    return (
        <>
            <input
                autoFocus
                type="text"
                inputMode="decimal"
                aria-label={`Amount in euros for ${label}`}
                aria-invalid={error !== null}
                aria-busy={isPending}
                readOnly={isPending}
                value={draft}
                onChange={(event) => {
                    setDraft(event.target.value);
                    setChanged(true);
                    lastAttempt.current = undefined;
                    setError(null);
                }}
                onBlur={() => save(true)}
                onKeyDown={(event) => {
                    if (event.nativeEvent.isComposing) return;
                    if (event.key === "Enter") {
                        event.preventDefault();
                        save(false);
                    } else if (event.key === "Escape" && !submitting.current && !isPending) {
                        event.preventDefault();
                        submitting.current = true;
                        onClose();
                    }
                }}
                className="w-full min-w-0 rounded border border-blue-400 px-2 py-1 text-right outline-none focus:ring-1 focus:ring-blue-400 read-only:opacity-50"
            />
            {error !== null ? <PlanAmountError message={error} /> : null}
        </>
    );
}
