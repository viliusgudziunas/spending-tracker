import React, { useState } from "react";
import useModal from "../hooks/useModal";
import useRules from "../hooks/useRules";
import Modal from "../lib/Modal/Modal";

interface CreateCategoryFormData {
    name: string;
}

const initialCreteCategoryFormData: CreateCategoryFormData = { name: "" };

const CreateCategoryModal: React.FC = () => {
    const store = useRules();
    const modalStore = useModal();
    const [formData, setFormData] = useState<CreateCategoryFormData>(initialCreteCategoryFormData);

    const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>): void =>
        setFormData((currentFormData) => ({ ...currentFormData, name: event.target.value }));

    const handleFormSubmit = async (event: React.FormEvent): Promise<void> => {
        event.preventDefault();

        if (!formData.name) return;
        const { name } = formData;

        try {
            await store.actions.createCategory({ name });
            await store.actions.fetchCategories();
            modalStore.actions.hideModal();
        } catch (error) {
            console.error("Error creating report:", error);
        }
    };

    return (
        <Modal>
            <h2>Create Category</h2>
            <form onSubmit={handleFormSubmit}>
                <div className="form-group">
                    <label>Name:</label>
                    <input type="text" value={formData.name} onChange={handleNameChange} required />
                </div>
                <div className="modal-buttons">
                    <button type="submit">Submit</button>
                    <button type="button" onClick={modalStore.actions.hideModal}>
                        Close
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default CreateCategoryModal;
