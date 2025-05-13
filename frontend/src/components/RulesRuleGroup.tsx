import { RuleGroup } from "../services/rules/api.types.parsed";

export interface RulesRuleGroupProps {
    ruleGroup: RuleGroup;
    index: number;
}

const RulesRuleGroup: React.FC<RulesRuleGroupProps> = ({ ruleGroup, index }) => {
    return (
        <tr>
            <td style={{ padding: 0 }}>
                <div style={{ width: "100%", overflowX: "auto" }}>
                    <table style={{ width: "max-content", backgroundColor: "#f4f4f4", minWidth: "100%" }}>
                        <colgroup>
                            <col style={{ width: "5%" }} />
                            <col style={{ width: "20%" }} />
                            <col style={{ width: "20%" }} />
                            <col style={{ width: "55%" }} />
                        </colgroup>
                        <thead>
                            <tr>
                                <th style={{ backgroundColor: "#e9ecef" }}>#</th>
                                <th style={{ backgroundColor: "#e9ecef" }}>Type</th>
                                <th style={{ backgroundColor: "#e9ecef" }}>Operator</th>
                                <th style={{ backgroundColor: "#e9ecef" }}>Value</th>
                            </tr>
                        </thead>
                        <tbody>
                            {ruleGroup.rules.map((rule) => (
                                <tr key={rule.id}>
                                    <td>{index + 1}</td>
                                    <td>{rule.type}</td>
                                    <td>{rule.operator}</td>
                                    <td>{rule.value}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </td>
        </tr>
    );
};

export default RulesRuleGroup;
