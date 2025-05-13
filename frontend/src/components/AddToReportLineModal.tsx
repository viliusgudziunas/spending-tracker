import { useState } from "react";
import useModal from "../hooks/useModal";
import useReports from "../hooks/useReports";
import Modal from "../lib/Modal/Modal";
import { Transaction } from "../services/reports/api.types.parsed";

interface AddToReportLineFormData {
    categoryId: string;
    filterId: string;
    transactionId: string;
}

const initialAddToReportLineFormData: AddToReportLineFormData = {
    categoryId: "",
    filterId: "",
    transactionId: "",
};

export interface AddToReportLineModalProps {
    transaction: Transaction;
}

const AddToReportLineModal: React.FC<AddToReportLineModalProps> = ({ transaction }) => {
    const modalStore = useModal();
    const reportsStore = useReports();
    const [formData, setFormData] = useState<AddToReportLineFormData>({
        ...initialAddToReportLineFormData,
        transactionId: transaction.id,
    });

    const handleFormSubmit = async (event: React.FormEvent): Promise<void> => {
        event.preventDefault();

        const { filterId, transactionId } = formData;
        if (!filterId || !transactionId || !reportsStore.state.selectedReport?.id) return;

        try {
            await reportsStore.actions.addToReportLine({ filterId, transactionId });
            const report = await reportsStore.actions.fetchReport(reportsStore.state.selectedReport.id);
            reportsStore.actions.selectReport(report);
            modalStore.actions.hideModal();
        } catch (error) {
            console.error("Error uploading file:", error);
        }
    };

    return (
        <Modal>
            <h2>Add to Report Line</h2>
            <form onSubmit={handleFormSubmit}>
                <div className="form-group">
                    <label>Category:</label>
                    <select
                        value={formData.categoryId}
                        onChange={(e) =>
                            setFormData((currentFormData) => ({ ...currentFormData, categoryId: e.target.value }))
                        }
                        required
                    >
                        <option value="">Select a category</option>
                        {reportsStore.state.selectedReport?.categories.map((category) => (
                            <option key={category.id} value={category.id}>
                                {category.name}
                            </option>
                        ))}
                    </select>
                </div>
                {formData.categoryId && (
                    <div className="form-group">
                        <label>Filter:</label>
                        <select
                            value={formData.filterId}
                            onChange={(e) =>
                                setFormData((currentFormData) => ({ ...currentFormData, filterId: e.target.value }))
                            }
                            required
                        >
                            <option value="">Select a filter</option>
                            {reportsStore.state.selectedReport?.categories
                                .find((category) => category.id === formData.categoryId)
                                ?.filters.map((filter) => (
                                    <option key={filter.id} value={filter.id}>
                                        {filter.name}
                                    </option>
                                ))}
                        </select>
                    </div>
                )}
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

export default AddToReportLineModal;
