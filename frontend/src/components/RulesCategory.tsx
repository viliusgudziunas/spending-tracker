import { useState } from "react";
import { Category } from "../services/rules/api.types.parsed";
import RulesFilter from "./RulesFilter";

export interface RulesCategoryProps {
    category: Category;
}

const RulesCategory: React.FC<RulesCategoryProps> = ({ category }) => {
    const [expanded, setExpanded] = useState(false);

    const onCategoryClick = (): void => setExpanded(!expanded);

    return (
        <>
            <tr style={{ cursor: "pointer" }} onClick={() => onCategoryClick()}>
                <td>{category.name}</td>
            </tr>

            {expanded && (
                <tr>
                    <td style={{ padding: 0 }}>
                        <div style={{ width: "100%", overflowX: "auto" }}>
                            <table style={{ width: "max-content", backgroundColor: "lightgray", minWidth: "100%" }}>
                                <thead>
                                    <tr>
                                        <th style={{ backgroundColor: "#e9ecef" }}>Filter</th>
                                        <th style={{ backgroundColor: "#e9ecef" }}>Position</th>
                                        <th style={{ backgroundColor: "#e9ecef" }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {category.filters.map((filter) => (
                                        <RulesFilter key={filter.id} filter={filter} />
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

export default RulesCategory;
