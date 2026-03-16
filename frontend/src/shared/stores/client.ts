import { API_URL } from "../../config";
import { createBackendClient } from "../../clients/backendClient/client";

if (!API_URL) {
    throw new Error("API URL is not configured. Set VITE_API_URL in frontend env.");
}

export const client = createBackendClient(API_URL);
