import { Dispatch, FormEvent, SetStateAction, useState } from "react";
import { PlanSection } from "../clients/backendClient/responseParsers";
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
    newName: string;
    setNewName: Dispatch<SetStateAction<string>>;
    newIsIncome: boolean;
    setNewIsIncome: Dispatch<SetStateAction<boolean>>;
    editingId: string | null;
    editedName: string;
    setEditedName: Dispatch<SetStateAction<string>>;
    cancelEditing: () => void;
    mutationError: Error | null;
    isCreatePending: boolean;
    isUpdatePending: boolean;
    isDeletePending: boolean;
    handleCreate: (event: FormEvent) => Promise<void>;
    handleStartEditing: (section: PlanSection) => void;
    handleRename: (event: FormEvent, section: PlanSection) => Promise<void>;
    handleMove: (section: PlanSection, position: number) => void;
    handleDelete: (section: PlanSection) => void;
}

function usePlanSectionsState(): UsePlanSectionsStateResult {
    const { data: sections, isLoading, isError } = usePlanSectionsQuery();
    const createMutation = useCreatePlanSectionMutation();
    const updateMutation = useUpdatePlanSectionMutation();
    const deleteMutation = useDeletePlanSectionMutation();
    const [newName, setNewName] = useState("");
    const [newIsIncome, setNewIsIncome] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editedName, setEditedName] = useState("");

    const resetMutationErrors = (): void => {
        if (createMutation.isError) createMutation.reset();
        if (updateMutation.isError) updateMutation.reset();
        if (deleteMutation.isError) deleteMutation.reset();
    };

    const handleCreate = async (event: FormEvent): Promise<void> => {
        event.preventDefault();
        const name = newName.trim();
        if (name === "") return;

        resetMutationErrors();
        try {
            await createMutation.mutateAsync({ name, isIncome: newIsIncome });
            setNewName("");
            setNewIsIncome(false);
        } catch {
            return;
        }
    };

    const handleStartEditing = (section: PlanSection): void => {
        resetMutationErrors();
        setEditingId(section.id);
        setEditedName(section.name);
    };

    const handleRename = async (event: FormEvent, section: PlanSection): Promise<void> => {
        event.preventDefault();
        const name = editedName.trim();
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
    };

    const handleMove = (section: PlanSection, position: number): void => {
        resetMutationErrors();
        updateMutation.mutate({ sectionId: section.id, payload: { position } });
    };

    const handleDelete = (section: PlanSection): void => {
        if (window.confirm(`Delete plan section "${section.name}"?`)) {
            resetMutationErrors();
            deleteMutation.mutate(section.id);
        }
    };

    return {
        sections,
        isLoading,
        isError,
        newName,
        setNewName,
        newIsIncome,
        setNewIsIncome,
        editingId,
        editedName,
        setEditedName,
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
