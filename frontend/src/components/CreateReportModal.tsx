import React, { useState } from "react";
import useModal from "../hooks/useModal";
import useReports from "../hooks/useReports";
import Modal from "../lib/Modal/Modal";

interface CreateReportFormData {
    bankStatement: File | null;
    name: string;
}

const initialCreteReportFormData: CreateReportFormData = { bankStatement: null, name: "" };

const CreateReportModal: React.FC = () => {
    const store = useReports();
    const modalStore = useModal();
    const [formData, setFormData] = useState<CreateReportFormData>(initialCreteReportFormData);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
        if (event.target.files && event.target.files[0]) {
            const file = event.target.files[0];
            setFormData((currentFormData) => ({ ...currentFormData, bankStatement: file }));
        }
    };

    const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>): void =>
        setFormData((currentFormData) => ({ ...currentFormData, name: event.target.value }));

    const handleFormSubmit = async (event: React.FormEvent): Promise<void> => {
        event.preventDefault();

        if (!(formData.bankStatement && formData.name)) return;
        const { bankStatement, name } = formData;

        try {
            await store.actions.createReport({ bankStatement, name });
            await store.actions.fetchReports();
            modalStore.actions.hideModal();
        } catch (error) {
            console.error("Error creating report:", error);
        }
    };

    return (
        <Modal>
            <h2>Create Report</h2>
            <form onSubmit={handleFormSubmit}>
                <div className="form-group">
                    <label>Bank statement:</label>
                    <input type="file" accept=".csv" onChange={handleFileChange} required />
                </div>
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

export default CreateReportModal;
