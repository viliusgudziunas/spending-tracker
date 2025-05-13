import { useEffect } from "react";
import useFilterForm from "../hooks/useFilterForm";
import useModal from "../hooks/useModal";
import useReports from "../hooks/useReports";
import useRules from "../hooks/useRules";
import Modal from "../lib/Modal/Modal";
import { Filter } from "../services/rules/api.types.parsed";

export interface EditFilterModalProps {
    filter: Filter;
}

const EditFilterModal: React.FC<EditFilterModalProps> = ({ filter }) => {
    const filterFormStore = useFilterForm();
    const rulesStore = useRules();
    const reportsStore = useReports();
    const modalStore = useModal();

    useEffect(() => filterFormStore.actions.initExistingFilter(filter), []);

    const handleFormSubmit = async (event: React.FormEvent): Promise<void> => {
        event.preventDefault();

        const { id, name, position, categoryId, ruleGroups } = filterFormStore.state.filter;
        if (!id || !name || !categoryId || !ruleGroups.length || position === undefined) return;

        try {
            await rulesStore.actions.updateFilter(id, { name, position, categoryId, ruleGroups });
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

    const filterPosition = filterFormStore.state.filter.position;
    const filterAfter = rulesStore.state.categories
        .find((category) => category.id === filterFormStore.state.filter.categoryId)
        ?.filters.filter((filter) => filter.id != filterFormStore.state.filter.id)
        .filter((filter) => filterPosition && filter.position <= filterPosition)
        .at(-1)?.name;

    const filterBefore = rulesStore.state.categories
        .find((category) => category.id === filterFormStore.state.filter.categoryId)
        ?.filters.filter((filter) => filter.id != filterFormStore.state.filter.id)
        .filter((filter) => filterPosition && filter.position > filterPosition)
        .at(0)?.name;

    return (
        <Modal>
            <h2>Edit Filter</h2>
            <form onSubmit={handleFormSubmit}>
                <div className="form-group">
                    <label>Name:</label>
                    <input
                        type="text"
                        value={filterFormStore.state.filter.name}
                        onChange={(e) => filterFormStore.actions.changeFilter("name", e.target.value)}
                        required
                    />
                </div>
                <>
                    <h3>Position</h3>
                    {filterAfter && <div>After: {filterAfter}</div>}
                    <div>
                        <label>Position:</label>
                        <input
                            type="number"
                            value={filterPosition || 0}
                            onChange={(e) => filterFormStore.actions.changeFilter("position", parseInt(e.target.value))}
                        />
                    </div>
                    {filterBefore && <div>Before: {filterBefore}</div>}
                </>
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

export default EditFilterModal;
