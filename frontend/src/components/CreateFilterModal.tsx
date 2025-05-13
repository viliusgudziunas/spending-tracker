import { useEffect } from "react";
import useFilterForm from "../hooks/useFilterForm";
import useModal from "../hooks/useModal";
import useReports from "../hooks/useReports";
import useRules from "../hooks/useRules";
import Modal from "../lib/Modal/Modal";
import { Transaction } from "../services/reports/api.types.parsed";
import { RuleOperator, RuleType } from "../services/rules/api.types.parsed";
import RuleFormGroup from "./RuleFormGroup";

export interface CreateFilterModalProps {
    transaction: Transaction;
}

const CreateFilterModal: React.FC<CreateFilterModalProps> = ({ transaction }) => {
    const filterFormStore = useFilterForm();
    const rulesStore = useRules();
    const modalStore = useModal();
    const reportsStore = useReports();

    useEffect(() => {
        const _fetchCategories = async (): Promise<void> => await rulesStore.actions.fetchCategories();
        _fetchCategories();
    }, []);
    useEffect(() => filterFormStore.actions.initNewFilter(transaction.description), [transaction]);

    const handleFormSubmit = async (event: React.FormEvent): Promise<void> => {
        event.preventDefault();

        const { name, categoryId, ruleGroups } = filterFormStore.state.filter;
        if (!name || !categoryId || !ruleGroups.length || !reportsStore.state.selectedReport?.id) return;

        try {
            await rulesStore.actions.createFilter({ name, categoryId, ruleGroups });
            const report = await reportsStore.actions.generateReport(reportsStore.state.selectedReport.id);
            reportsStore.actions.selectReport(report);
            modalStore.actions.hideModal();
        } catch (error) {
            console.error("Error uploading file:", error);
        }
    };

    const filterPosition = filterFormStore.state.filter.position;
    const filterAfter = rulesStore.state.categories
        .find((category) => category.id === filterFormStore.state.filter.categoryId)
        ?.filters.filter((filter) => filterPosition && filter.position <= filterPosition)
        .at(-1)?.name;

    const filterBefore = rulesStore.state.categories
        .find((category) => category.id === filterFormStore.state.filter.categoryId)
        ?.filters.filter((filter) => filterPosition && filter.position > filterPosition)
        .at(0)?.name;

    return (
        <Modal>
            <h2>Create Filter</h2>
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
                            <button type="button" onClick={() => filterFormStore.actions.addRule(group.id as string)}>
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
                <button type="button" onClick={() => filterFormStore.actions.addRuleGroup()}>
                    Add Rule Group
                </button>
                {filterFormStore.state.filter.categoryId && (
                    <div>
                        {filterPosition === undefined ? (
                            <button type="button" onClick={() => filterFormStore.actions.specifyPosition()}>
                                Specify Position
                            </button>
                        ) : (
                            <>
                                <h3>Position</h3>
                                {filterAfter && <div>After: {filterAfter}</div>}
                                <div>
                                    <label>Position:</label>
                                    <input
                                        type="number"
                                        value={filterPosition}
                                        onChange={(e) =>
                                            filterFormStore.actions.changeFilter("position", parseInt(e.target.value))
                                        }
                                    />
                                </div>
                                {filterBefore && <div>Before: {filterBefore}</div>}
                            </>
                        )}
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

export default CreateFilterModal;
