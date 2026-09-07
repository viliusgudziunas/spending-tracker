export type PreviewRow = Record<string, string>;

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

export function parseCsvContent(content: string): { headers: string[]; rows: PreviewRow[] } {
    const normalizedContent = content.replace(/^\uFEFF/, "");
    const lines = normalizedContent
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

    if (lines.length === 0) {
        return { headers: [], rows: [] };
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

    return { headers, rows };
}

function csvEscape(value: string): string {
    if (/[",\n\r]/.test(value)) {
        return `"${value.replaceAll('"', '""')}"`;
    }
    return value;
}

export function serializePreviewCsv(headers: string[], rows: PreviewRow[]): string {
    const headerLine = headers.map(csvEscape).join(",");
    const body = rows.map((row) => headers.map((header) => csvEscape(row[header] ?? "")).join(","));
    return [headerLine, ...body].join("\n");
}
