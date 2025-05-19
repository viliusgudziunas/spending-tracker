import { useState } from "react";
import useModal from "../hooks/useModal";
import { Filter } from "../services/rules/api.types.parsed";
import DeleteFilterModal from "./DeleteFilterModal";
import EditFilterModal from "./EditFilterModal";
import RulesRuleGroup from "./RulesRuleGroup";

export interface RulesFilterProps {
    filter: Filter;
}

const RulesFilter: React.FC<RulesFilterProps> = ({ filter }) => {
    const modalStore = useModal();
    const [expanded, setExpanded] = useState(false);

    const onFilterClick = (): void => setExpanded(!expanded);

    const onEditClick = (e: React.MouseEvent<HTMLButtonElement>): void => {
        e.stopPropagation();

        modalStore.actions.showModal(<EditFilterModal filter={filter} />);
    };

    const onDeleteClick = (e: React.MouseEvent<HTMLButtonElement>): void => {
        e.stopPropagation();

        modalStore.actions.showModal(<DeleteFilterModal filter={filter} />);
    };

    return (
        <>
            <tr style={{ cursor: "pointer" }} onClick={() => onFilterClick()}>
                <td>{filter.name}</td>
                <td>{filter.position}</td>
                <td>
                    <button style={{ marginRight: "5px", cursor: "pointer" }} onClick={onEditClick}>
                        Edit
                    </button>
                    <button style={{ marginRight: "5px", cursor: "pointer" }} onClick={onDeleteClick}>
                        Delete
                    </button>
                </td>
            </tr>

            {expanded && (
                <tr>
                    <td colSpan={3} style={{ padding: 0 }}>
                        <div style={{ width: "100%", overflowX: "auto" }}>
                            <table style={{ width: "max-content", backgroundColor: "lightgray", minWidth: "100%" }}>
                                <tbody>
                                    {filter.ruleGroups.map((ruleGroup, index) => (
                                        <RulesRuleGroup key={ruleGroup.id} ruleGroup={ruleGroup} index={index} />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </td>
                </tr>
            )}
        </>
    );
};

export default RulesFilter;
