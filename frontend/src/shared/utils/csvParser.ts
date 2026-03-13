import { type ColDef } from "ag-grid-community";

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

export { parseCsvContent };
export type { PreviewRow };
