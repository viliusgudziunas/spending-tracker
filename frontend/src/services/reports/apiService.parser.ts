import { CreateApiOverridePayload } from "../api.types";
import { CreateOverridePayload } from "./apiService";

export const parseIntoCreateOverridePayload = (payload: CreateOverridePayload): CreateApiOverridePayload => ({
    filter_id: payload.filterId,
    transaction_id: payload.transactionId,
});
