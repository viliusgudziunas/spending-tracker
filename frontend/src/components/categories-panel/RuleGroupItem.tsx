import { RuleGroup } from "../../clients/backendClient/responseParsers";

interface RuleGroupItemProps {
    ruleGroup: RuleGroup;
}

export default function RuleGroupItem({ ruleGroup }: RuleGroupItemProps): JSX.Element {
    return (
        <div className="py-1">
            <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                {ruleGroup.operator}
            </span>
            <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
                {ruleGroup.rules.map((rule) => (
                    <li key={rule.id} className="flex items-center gap-1.5 py-0.5 text-[11px] text-slate-500">
                        <span className="font-medium text-slate-600">{rule.type}</span>
                        <span className="text-slate-400">{rule.operator}</span>
                        <span className="truncate text-slate-700">{rule.value}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}
