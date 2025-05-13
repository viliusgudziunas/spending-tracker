import { useEffect } from "react";
import useFilterForm from "../hooks/useFilterForm";
import useModal from "../hooks/useModal";
import useReports from "../hooks/useReports";
import useRules from "../hooks/useRules";
import Modal from "../lib/Modal/Modal";
import { Transaction } from "../services/reports/api.types.parsed";
import { RuleOperator, RuleType } from "../services/rules/api.types.parsed";
import RuleFormGroup from "./RuleFormGroup";

export interface AddToFilterModalProps {
    transaction: Transaction;
}

const AddToFilterModal: React.FC<AddToFilterModalProps> = ({ transaction }) => {
    const filterFormStore = useFilterForm();
    const rulesStore = useRules();
    const modalStore = useModal();
    const reportsStore = useReports();

    useEffect(() => {
        const _fetchCategories = async (): Promise<void> => await rulesStore.actions.fetchCategories();
        _fetchCategories();
    }, []);

    const handleSelectFilter = async (event: React.ChangeEvent<HTMLSelectElement>): Promise<void> => {
        const filter = rulesStore.state.categories
            .find((category) => category.id === filterFormStore.state.filter.categoryId)
            ?.filters.find((filter) => filter.id === event.target.value);
        if (!filter) return;
        filterFormStore.actions.initExistingFilter(filter);
    };

    const handleFormSubmit = async (event: React.FormEvent): Promise<void> => {
        event.preventDefault();

        const { id, name, categoryId, ruleGroups } = filterFormStore.state.filter;
        if (!id || !name || !categoryId || !ruleGroups.length || !reportsStore.state.selectedReport?.id) return;

        try {
            await rulesStore.actions.updateFilter(id, { name, categoryId, ruleGroups });
            const report = await reportsStore.actions.generateReport(reportsStore.state.selectedReport.id);
            reportsStore.actions.selectReport(report);
            modalStore.actions.hideModal();
        } catch (error) {
            console.error("Error uploading file:", error);
        }
    };

    return (
        <Modal>
            <h2>Add to Filter</h2>
            <form onSubmit={handleFormSubmit}>
                <div className="form-group">
                    <label>Category:</label>
                    <select
                        value={filterFormStore.state.filter.categoryId}
                        onChange={(e) => filterFormStore.actions.changeFilter("categoryId", e.target.value)}
                        required
                    >
                        <option value="">Select a category</option>
                        {rulesStore.state.categories.map((category) => (
                            <option key={category.id} value={category.id}>
                                {category.name}
                            </option>
                        ))}
                    </select>
                </div>
                {filterFormStore.state.filter.categoryId && (
                    <div className="form-group">
                        <label>Filter:</label>
                        <select value={filterFormStore.state.filter.id} onChange={handleSelectFilter} required>
                            <option value="">Select a filter</option>
                            {rulesStore.state.categories
                                .find((category) => category.id === filterFormStore.state.filter.categoryId)
                                ?.filters.map((filter) => (
                                    <option key={filter.id} value={filter.id}>
                                        {filter.name}
                                    </option>
                                ))}
                        </select>
                    </div>
                )}
                {filterFormStore.state.filter.id && (
                    <>
                        {filterFormStore.state.filter.ruleGroups.map((group, i) => (
                            <div key={group.id}>
                                <h3>Rule Group {i + 1}</h3>
                                {group.rules.map((rule) => (
                                    <RuleFormGroup
                                        key={rule.id}
                                        ruleId={rule.id as string}
                                        typeValue={rule.type}
                                        typeOnChange={(e) =>
                                            filterFormStore.actions.changeRule(
                                                group.id as string,
                                                rule.id as string,
                                                "type",
                                                e.target.value as RuleType
                                            )
                                        }
                                        operatorValue={rule.operator}
                                        operatorOnChange={(e) =>
                                            filterFormStore.actions.changeRule(
                                                group.id as string,
                                                rule.id as string,
                                                "operator",
                                                e.target.value as RuleOperator
                                            )
                                        }
                                        ruleValue={rule.value}
                                        ruleOnChange={(e) =>
                                            filterFormStore.actions.changeRule(
                                                group.id as string,
                                                rule.id as string,
                                                "value",
                                                e.target.value
                                            )
                                        }
                                    />
                                ))}
                                <div className="modal-buttons">
                                    <button
                                        type="button"
                                        onClick={() => filterFormStore.actions.addRule(group.id as string)}
                                    >
                                        Add Rule
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => filterFormStore.actions.removeRuleGroup(group.id as string)}
                                    >
                                        Remove Rule Group
                                    </button>
                                </div>
                            </div>
                        ))}
                        <button
                            type="button"
                            onClick={() => filterFormStore.actions.addRuleGroup(transaction.description)}
                        >
                            Add Rule Group
                        </button>
                    </>
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

export default AddToFilterModal;
