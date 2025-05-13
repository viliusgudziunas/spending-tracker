import { RULE_OPERATORS, RULE_TYPES } from "../services/api.types";
import { RuleOperator } from "../services/rules/api.types.parsed";

export interface RuleFormGroupProps {
    ruleId: string;
    typeValue: string;
    typeOnChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    operatorValue: string;
    operatorOnChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    ruleValue: string;
    ruleOnChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const operatorsMap: Record<RuleOperator, string> = {
    EQUAL: "=",
    NOT_EQUAL: "≠",
    GREATER_THAN: ">",
    LESS_THAN: "<",
    GREATER_THAN_EQUAL: "≥",
    LESS_THAN_EQUAL: "≤",
};

const RuleFormGroup: React.FC<RuleFormGroupProps> = ({
    ruleId,
    typeValue,
    typeOnChange,
    operatorValue,
    operatorOnChange,
    ruleValue,
    ruleOnChange,
}) => {
    return (
        <div className="form-group">
            <div className="form-group-inline">
                <select value={typeValue} onChange={typeOnChange} required>
                    {RULE_TYPES.map((type) => (
                        <option key={`${ruleId}_${type}`} value={type}>
                            {" "}
                            {type}{" "}
                        </option>
                    ))}
                </select>
                <select value={operatorValue} onChange={operatorOnChange} required>
                    {RULE_OPERATORS.map((operator) => (
                        <option key={`${ruleId}_${operator}`} value={operator}>
                            {operatorsMap[operator]}
                        </option>
                    ))}
                </select>
                <input type="text" value={ruleValue} onChange={ruleOnChange} required />
            </div>
        </div>
    );
};

export default RuleFormGroup;
