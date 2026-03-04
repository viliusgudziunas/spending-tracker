import { AllCommunityModule, ModuleRegistry, themeQuartz, type ColDef } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { ChangeEvent, useMemo, useState } from "react";
import { useCreateReportMutation } from "../services/reports/queries";

ModuleRegistry.registerModules([AllCommunityModule]);

type PreviewRow = Record<string, string>;

function splitDelimitedRow(line: string, delimiter: string): string[] {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i += 1) {
        const char = line[i];
        const nextChar = line[i + 1];

        if (char === '"' && inQuotes && nextChar === '"') {
            current += '"';
            i += 1;
            continue;
        }

        if (char === '"') {
            inQuotes = !inQuotes;
            continue;
        }

        if (char === delimiter && !inQuotes) {
            values.push(current.trim());
            current = "";
            continue;
        }

        current += char;
    }

    values.push(current.trim());
    return values;
}

function detectDelimiter(headerLine: string): string {
    const candidates = [",", "\t", ";"];
    let selected = ",";
    let maxColumns = 0;

    for (const candidate of candidates) {
        const columns = splitDelimitedRow(headerLine, candidate).length;
        if (columns > maxColumns) {
            maxColumns = columns;
            selected = candidate;
        }
    }

    return selected;
}

function parseCsvContent(content: string): { columnDefs: ColDef<PreviewRow>[]; rows: PreviewRow[] } {
    const normalizedContent = content.replace(/^\uFEFF/, "");
    const lines = normalizedContent
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

    if (lines.length === 0) {
        return { columnDefs: [], rows: [] };
    }

    const delimiter = detectDelimiter(lines[0]);
    const headers = splitDelimitedRow(lines[0], delimiter);
    const rows = lines.slice(1).map((line) => {
        const values = splitDelimitedRow(line, delimiter);
        return headers.reduce<PreviewRow>((acc, header, index) => {
            acc[header] = values[index] ?? "";
            return acc;
        }, {});
    });

    const columnDefs = headers.map<ColDef<PreviewRow>>((header) => ({
        field: header,
        headerName: header,
        resizable: true,
        sortable: true,
        filter: true,
    }));

    return { columnDefs, rows };
}

export default function ReportUploadPage(): JSX.Element {
    const createReportMutation = useCreateReportMutation();
    const [file, setFile] = useState<File | null>(null);
    const [reportName, setReportName] = useState<string>("");
    const [columnDefs, setColumnDefs] = useState<ColDef<PreviewRow>[]>([]);
    const [rows, setRows] = useState<PreviewRow[]>([]);
    const [uploadMessage, setUploadMessage] = useState<string>("");
    const isSuccessMessage = uploadMessage.toLowerCase().includes("success");

    const defaultColDef = useMemo<ColDef<PreviewRow>>(
        () => ({
            resizable: true,
            sortable: true,
            filter: true,
            flex: 1,
            minWidth: 140,
        }),
        [],
    );

    const handleFileChange = (event: ChangeEvent<HTMLInputElement>): void => {
        const selectedFile = event.target.files?.[0] ?? null;
        setFile(selectedFile);
        setUploadMessage("");

        if (selectedFile === null) {
            setColumnDefs([]);
            setRows([]);
            return;
        }

        const reader = new FileReader();
        reader.onload = (loadEvent): void => {
            const csvContent = loadEvent.target?.result;
            if (typeof csvContent !== "string") {
                setColumnDefs([]);
                setRows([]);
                return;
            }

            const parsed = parseCsvContent(csvContent);
            setColumnDefs(parsed.columnDefs);
            setRows(parsed.rows);
        };
        reader.readAsText(selectedFile);
    };

    const handleUpload = async (): Promise<void> => {
        if (file === null || reportName.trim().length === 0) {
            setUploadMessage("Please choose a CSV file and enter report name.");
            return;
        }

        setUploadMessage("");
        try {
            await createReportMutation.mutateAsync({
                bankStatement: file,
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

    return (
        <div className="flex flex-col gap-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <h2 className="m-0 text-lg font-semibold text-slate-900">Upload CSV</h2>
                <p className="m-0 mt-1 text-xs text-slate-500">Select a CSV file and create a new report.</p>

                <div className="mt-3 flex flex-wrap items-end gap-3">
                    <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-700">
                        CSV file
                        <input type="file" accept=".csv,text/csv" onChange={handleFileChange} />
                    </label>

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
                        disabled={createReportMutation.isPending}
                        className="min-h-[34px] rounded-md bg-blue-600 px-3 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                    >
                        {createReportMutation.isPending ? "Uploading..." : "Upload CSV"}
                    </button>

                    <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span>{file !== null ? `File: ${file.name}` : "No file selected"}</span>
                        <span>{`Rows: ${rows.length}`}</span>
                        <span>{`Columns: ${columnDefs.length}`}</span>
                    </div>
                </div>

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
