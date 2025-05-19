import useModal from "../hooks/useModal";
import useReports from "../hooks/useReports";
import useRules from "../hooks/useRules";
import Modal from "../lib/Modal/Modal";
import { Filter } from "../services/rules/api.types.parsed";

export interface DeleteFilterModalProps {
    filter: Filter;
}

const DeleteFilterModal: React.FC<DeleteFilterModalProps> = ({ filter }) => {
    const rulesStore = useRules();
    const reportsStore = useReports();
    const modalStore = useModal();

    const handleFormSubmit = async (event: React.FormEvent): Promise<void> => {
        event.preventDefault();

        try {
            await rulesStore.actions.deleteFilter(filter.id);
            await rulesStore.actions.fetchCategories();
            if (reportsStore.state.selectedReport?.id) {
                const report = await reportsStore.actions.generateReport(reportsStore.state.selectedReport.id);
                reportsStore.actions.selectReport(report);
            }
            modalStore.actions.hideModal();
        } catch (error) {
            console.error("Error uploading file:", error);
        }
    };

    return (
        <Modal>
            <h2>Delete Filter</h2>
            <p>Are you sure you want to delete this filter?</p>
            <form onSubmit={handleFormSubmit}>
                <div className="modal-buttons">
                    <button type="submit">Delete</button>
                    <button type="button" onClick={modalStore.actions.hideModal}>
                        Close
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default DeleteFilterModal;
