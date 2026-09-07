import { type ColDef, themeQuartz } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { type ChangeEvent, type DragEvent, useMemo, useRef, useState } from "react";

import { useCreateReportMutation } from "@/hooks/useReportsQueries";
import { parseCsvContent, type PreviewRow, serializePreviewCsv } from "@/shared/utils/csvParser";

function previewRowField(row: PreviewRow, name: string): string {
    const key = Object.keys(row).find((header) => header.replaceAll(" ", "_").toLowerCase() === name);
    if (key === undefined) {
        return "";
    }
    return row[key].trim();
}

function isUnsettledPreviewRow(row: PreviewRow): boolean {
    const state = previewRowField(row, "state").toLowerCase();
    return state === "reverted" || state === "pending";
}

function previewColumnDefs(headers: string[]): ColDef<PreviewRow>[] {
    return headers.map((header) => ({
        field: header,
        headerName: header,
        resizable: true,
        sortable: true,
        filter: true,
    }));
}

function unsettledRowLabel(row: PreviewRow): string {
    const description = previewRowField(row, "description") || "Untitled";
    const amount = previewRowField(row, "amount");
    const state = previewRowField(row, "state") || "unsettled";
    if (amount.length === 0) {
        return `${description} · ${state}`;
    }
    return `${description} (${amount}) · ${state}`;
}

export default function ReportUploadPage(): JSX.Element {
    const createReportMutation = useCreateReportMutation();
    const [file, setFile] = useState<File | null>(null);
    const [reportName, setReportName] = useState<string>("");
    const [headers, setHeaders] = useState<string[]>([]);
    const [rows, setRows] = useState<PreviewRow[]>([]);
    const columnDefs = useMemo(() => previewColumnDefs(headers), [headers]);
    const [uploadMessage, setUploadMessage] = useState<string>("");
    const isSuccessMessage = uploadMessage.toLowerCase().includes("success");
    const unsettledRows = useMemo(() => rows.filter(isUnsettledPreviewRow), [rows]);

    const defaultColDef = useMemo<ColDef<PreviewRow>>(
        () => ({
            resizable: false,
            sortable: true,
            filter: true,
            flex: 1,
            minWidth: 140,
        }),
        [],
    );

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragOver, setIsDragOver] = useState(false);

    const processFile = (selectedFile: File | null): void => {
        setFile(selectedFile);
        setUploadMessage("");

        if (selectedFile === null) {
            setHeaders([]);
            setRows([]);
            return;
        }

        const reader = new FileReader();
        reader.onload = (loadEvent): void => {
            const csvContent = loadEvent.target?.result;
            if (typeof csvContent !== "string") {
                setHeaders([]);
                setRows([]);
                return;
            }

            const parsed = parseCsvContent(csvContent);
            setHeaders(parsed.headers);
            setRows(parsed.rows);
        };
        reader.readAsText(selectedFile);
    };

    const handleFileChange = (event: ChangeEvent<HTMLInputElement>): void => {
        processFile(event.target.files?.[0] ?? null);
    };

    const handleDrop = (event: DragEvent<HTMLButtonElement>): void => {
        event.preventDefault();
        setIsDragOver(false);
        processFile(event.dataTransfer.files[0] ?? null);
    };

    const handleDragOver = (event: DragEvent<HTMLButtonElement>): void => {
        event.preventDefault();
        setIsDragOver(true);
    };

    const handleDragLeave = (): void => {
        setIsDragOver(false);
    };

    const handleUpload = async (): Promise<void> => {
        if (file === null || reportName.trim().length === 0) {
            setUploadMessage("Please choose a CSV file and enter report name.");
            return;
        }
        if (unsettledRows.length > 0) {
            setUploadMessage("Remove reverted and pending transactions before uploading.");
            return;
        }
        if (rows.length === 0) {
            setUploadMessage("No transactions left to upload.");
            return;
        }

        setUploadMessage("");
        try {
            const csv = serializePreviewCsv(headers, rows);
            const statementFile = new File([csv], file.name, { type: "text/csv" });
            await createReportMutation.mutateAsync({
                bankStatement: statementFile,
                name: reportName.trim(),
            });
            setUploadMessage("Report uploaded successfully.");
        } catch (error: unknown) {
            if (error instanceof Error && error.message.trim().length > 0) {
                setUploadMessage(error.message);
            } else {
                setUploadMessage("Failed to upload report.");
            }
        }
    };

    const handleRemoveUnsettled = (): void => {
        setRows((currentRows) => currentRows.filter((row) => !isUnsettledPreviewRow(row)));
        setUploadMessage("");
    };

    return (
        <div className="flex flex-col gap-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <h2 className="m-0 text-lg font-semibold text-slate-900">Upload CSV</h2>
                <p className="m-0 mt-1 text-xs text-slate-500">Select a CSV file and create a new report.</p>

                <div className="mt-3 flex flex-col gap-3">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv,text/csv"
                        onChange={handleFileChange}
                        className="hidden"
                    />
                    <button
                        type="button"
                        onClick={(): void => fileInputRef.current?.click()}
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        className={`flex min-h-[80px] flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-5 transition ${
                            isDragOver
                                ? "border-blue-400 bg-blue-50"
                                : file !== null
                                  ? "border-green-300 bg-green-50"
                                  : "border-slate-300 bg-slate-50 hover:border-slate-400 hover:bg-slate-100"
                        }`}
                    >
                        {file !== null ? (
                            <>
                                <span className="text-sm font-medium text-green-700">{file.name}</span>
                                <span className="mt-1 text-xs text-green-600">
                                    {rows.length} rows &middot; {columnDefs.length} columns &middot; click or drop to
                                    replace
                                </span>
                            </>
                        ) : (
                            <>
                                <span className="text-sm font-medium text-slate-600">
                                    Drop a CSV file here or click to browse
                                </span>
                                <span className="mt-1 text-xs text-slate-400">.csv files only</span>
                            </>
                        )}
                    </button>

                    <div className="flex flex-wrap items-end gap-3">
                        <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-700">
                            Report name
                            <input
                                value={reportName}
                                onChange={(event): void => setReportName(event.target.value)}
                                placeholder="e.g. January 2026"
                                className="min-h-[34px] rounded-md border border-slate-300 px-2 py-1.5 text-xs font-normal text-slate-900 placeholder:text-slate-400"
                            />
                        </label>

                        <button
                            type="button"
                            onClick={(): void => void handleUpload()}
                            disabled={createReportMutation.isPending || unsettledRows.length > 0}
                            className="min-h-[34px] rounded-md bg-blue-600 px-3 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                        >
                            {createReportMutation.isPending ? "Uploading..." : "Upload CSV"}
                        </button>
                    </div>
                </div>

                {unsettledRows.length > 0 ? (
                    <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 px-2.5 py-2 text-xs text-amber-950">
                        <p className="font-semibold">
                            This statement has {unsettledRows.length}{" "}
                            {unsettledRows.length === 1 ? "transaction" : "transactions"} that never settled (reverted
                            or pending). They are not spending. Remove them to continue.
                        </p>
                        <ul className="mt-2 max-h-32 list-disc overflow-y-auto pl-4 font-normal">
                            {unsettledRows.map((row, index) => (
                                <li key={`${unsettledRowLabel(row)}-${index}`}>{unsettledRowLabel(row)}</li>
                            ))}
                        </ul>
                        <button
                            type="button"
                            onClick={handleRemoveUnsettled}
                            className="mt-2 min-h-[30px] rounded-md bg-amber-700 px-2.5 text-xs font-semibold text-white transition hover:bg-amber-800"
                        >
                            Remove them from this statement
                        </button>
                    </div>
                ) : null}

                {uploadMessage.length > 0 ? (
                    <div
                        className={`mt-3 rounded-md border px-2.5 py-2 text-xs font-medium ${
                            isSuccessMessage
                                ? "border-green-300 bg-green-50 text-green-800"
                                : "border-red-300 bg-red-50 text-red-800"
                        }`}
                    >
                        {uploadMessage}
                    </div>
                ) : null}
            </div>

            <div className="w-full overflow-hidden rounded-xl border border-slate-200 bg-white">
                <AgGridReact<PreviewRow>
                    theme={themeQuartz}
                    columnDefs={columnDefs}
                    rowData={rows}
                    defaultColDef={defaultColDef}
                    domLayout="autoHeight"
                />
            </div>
        </div>
    );
}
