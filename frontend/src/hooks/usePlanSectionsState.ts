import { useState } from "react";

import { type PlanSection } from "@/clients/backendClient/responseParsers";
import { type CreatePlanSectionPayload } from "@/clients/backendClient/types";

import {
    useCreatePlanSectionMutation,
    useDeletePlanSectionMutation,
    usePlanSectionsQuery,
    useUpdatePlanSectionMutation,
} from "./usePlanQueries";

interface UsePlanSectionsStateResult {
    sections: PlanSection[] | undefined;
    isLoading: boolean;
    isError: boolean;
    isCreatingSection: boolean;
    startCreatingSection: () => void;
    cancelCreatingSection: () => void;
    editingId: string | null;
    cancelEditing: () => void;
    mutationError: Error | null;
    isCreatePending: boolean;
    isUpdatePending: boolean;
    isDeletePending: boolean;
    handleCreate: (payload: CreatePlanSectionPayload) => Promise<void>;
    handleStartEditing: (section: PlanSection) => void;
    handleRename: (section: PlanSection, draftName: string) => Promise<void>;
    handleMove: (section: PlanSection, position: number) => void;
    handleDelete: (section: PlanSection) => void;
}

function usePlanSectionsState(): UsePlanSectionsStateResult {
    const { data: sections, isLoading, isError } = usePlanSectionsQuery();
    const createMutation = useCreatePlanSectionMutation();
    const updateMutation = useUpdatePlanSectionMutation();
    const deleteMutation = useDeletePlanSectionMutation();
    const [isCreatingSection, setIsCreatingSection] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const resetMutationErrors = (): void => {
        if (createMutation.isError) createMutation.reset();
        if (updateMutation.isError) updateMutation.reset();
        if (deleteMutation.isError) deleteMutation.reset();
    };

    function startCreatingSection(): void {
        setIsCreatingSection(true);
    }

    function cancelCreatingSection(): void {
        setIsCreatingSection(false);
        createMutation.reset();
    }

    async function handleCreate(payload: CreatePlanSectionPayload): Promise<void> {
        const name = payload.name.trim();
        if (name === "" || createMutation.isPending) return;

        resetMutationErrors();
        try {
            await createMutation.mutateAsync({ ...payload, name });
            setIsCreatingSection(false);
        } catch {
            return;
        }
    }

    function handleStartEditing(section: PlanSection): void {
        resetMutationErrors();
        setEditingId(section.id);
    }

    async function handleRename(section: PlanSection, draftName: string): Promise<void> {
        const name = draftName.trim();
        if (name === "") return;
        if (name === section.name) {
            setEditingId(null);
            return;
        }

        resetMutationErrors();
        try {
            await updateMutation.mutateAsync({ sectionId: section.id, payload: { name } });
            setEditingId(null);
        } catch {
            return;
        }
    }

    const handleMove = (section: PlanSection, position: number): void => {
        resetMutationErrors();
        updateMutation.mutate({ sectionId: section.id, payload: { position } });
    };

    function handleDelete(section: PlanSection): void {
        const rowCount = section.lines.length;
        const message =
            rowCount === 0
                ? `Delete plan section "${section.name}"?`
                : `Delete plan section "${section.name}" and its ${rowCount} ${rowCount === 1 ? "row" : "rows"}? This cannot be undone.`;
        if (window.confirm(message)) {
            resetMutationErrors();
            deleteMutation.mutate(section.id);
        }
    }

    return {
        sections,
        isLoading,
        isError,
        isCreatingSection,
        startCreatingSection,
        cancelCreatingSection,
        editingId,
        cancelEditing: (): void => setEditingId(null),
        mutationError: createMutation.error ?? updateMutation.error ?? deleteMutation.error,
        isCreatePending: createMutation.isPending,
        isUpdatePending: updateMutation.isPending,
        isDeletePending: deleteMutation.isPending,
        handleCreate,
        handleStartEditing,
        handleRename,
        handleMove,
        handleDelete,
    };
}

export default usePlanSectionsState;
