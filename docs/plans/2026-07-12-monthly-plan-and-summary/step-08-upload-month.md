# Step 8 — Month on upload

Read [conventions.md](conventions.md) first. Requires step 7 (`report.month` exists).

## Goal

New reports get their month at creation time instead of needing a follow-up edit.

## Backend

1. `POST /reports` (multipart form in `report_routes.py`) accepts an optional `month` form field alongside `name` and `upload_file`. Same validation and duplicate handling as step 7.
2. Pass it through `report_service` / `report_repository` to the created `Report`.

## Frontend

1. `createReport` in `client.ts` appends `month` to the FormData; `CreateReportPayload` in `types.ts` gains it.
2. Upload page (`frontend/src/components/ReportUploadPage.tsx`): month picker next to the name input, defaulting to the previous calendar month (statements are usually uploaded just after a month ends). Duplicate-month errors surface in the existing upload error display.

## Done when

Uploading a statement with a month set creates a report that already shows its month in the sidebar; trying to upload for an already-taken month fails with a clear message.

## Out of scope

The summary page (step 9). This completes Phase 2.
