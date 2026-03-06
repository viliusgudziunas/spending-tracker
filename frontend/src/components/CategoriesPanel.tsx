import { useCallback, useState } from "react";
import { Category, Filter, RuleGroup } from "../services/rules/api.types.parsed";
import { useCategoriesQuery, useCreateCategoryMutation } from "../services/categories/queries";

interface CategoriesPanelProps {
    onClose: () => void;
    width: number;
}

export default function CategoriesPanel({ onClose, width }: CategoriesPanelProps): JSX.Element {
    const { data: categories, isLoading, isError } = useCategoriesQuery();

    return (
        <div className="sticky top-4 flex shrink-0 flex-col gap-3 self-start" style={{ width }}>
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <h2 className="m-0 text-lg font-semibold text-slate-900">Categories</h2>
                <button
                    type="button"
                    onClick={onClose}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                >
                    &#x2715;
                </button>
            </div>

            <div className="flex max-h-[calc(100vh-8rem)] flex-col gap-2 overflow-y-auto">
                {isLoading ? (
                    <div className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
                        <p className="m-0 text-sm text-slate-400">Loading categories...</p>
                    </div>
                ) : null}

                {isError ? (
                    <div className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
                        <p className="m-0 text-sm text-red-500">Failed to load categories.</p>
                    </div>
                ) : null}

                {categories !== undefined && categories.length === 0 ? (
                    <div className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
                        <p className="m-0 text-sm text-slate-400">No categories yet.</p>
                    </div>
                ) : null}

                {categories !== undefined
                    ? categories.map((category) => <CategoryCard key={category.id} category={category} />)
                    : null}

                <CreateCategoryForm />
            </div>
        </div>
    );
}

interface CategoryCardProps {
    category: Category;
}

function CategoryCard({ category }: CategoryCardProps): JSX.Element {
    const [expanded, setExpanded] = useState(false);

    return (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <button
                type="button"
                onClick={(): void => setExpanded((prev) => !prev)}
                className="flex w-full items-center justify-between px-4 py-3 text-left transition hover:bg-slate-50"
            >
                <div className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-slate-800">{category.name}</span>
                    <span className="text-xs text-slate-400">
                        {category.filters.length} filter{category.filters.length !== 1 ? "s" : ""}
                    </span>
                </div>
                <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`shrink-0 text-slate-400 transition-transform ${expanded ? "rotate-90" : ""}`}
                >
                    <polyline points="6 3 11 8 6 13" />
                </svg>
            </button>

            {expanded ? (
                <div className="border-t border-slate-100 px-4 py-2">
                    {category.filters.length === 0 ? (
                        <p className="m-0 py-2 text-xs text-slate-400">No filters in this category.</p>
                    ) : (
                        <ul className="m-0 flex list-none flex-col gap-1 p-0">
                            {category.filters.map((filter) => (
                                <FilterItem key={filter.id} filter={filter} />
                            ))}
                        </ul>
                    )}
                </div>
            ) : null}
        </div>
    );
}

interface FilterItemProps {
    filter: Filter;
}

function FilterItem({ filter }: FilterItemProps): JSX.Element {
    const [expanded, setExpanded] = useState(false);

    return (
        <li>
            <button
                type="button"
                onClick={(): void => setExpanded((prev) => !prev)}
                className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left transition hover:bg-slate-50"
            >
                <span className="truncate text-xs font-medium text-slate-700">{filter.name}</span>
                {filter.ruleGroups.length > 0 ? (
                    <svg
                        width="12"
                        height="12"
                        viewBox="0 0 16 16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={`shrink-0 text-slate-300 transition-transform ${expanded ? "rotate-90" : ""}`}
                    >
                        <polyline points="6 3 11 8 6 13" />
                    </svg>
                ) : null}
            </button>

            {expanded && filter.ruleGroups.length > 0 ? (
                <div className="ml-2 border-l border-slate-100 pl-2">
                    {filter.ruleGroups.map((group) => (
                        <RuleGroupItem key={group.id} ruleGroup={group} />
                    ))}
                </div>
            ) : null}
        </li>
    );
}

interface RuleGroupItemProps {
    ruleGroup: RuleGroup;
}

function RuleGroupItem({ ruleGroup }: RuleGroupItemProps): JSX.Element {
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

function CreateCategoryForm(): JSX.Element {
    const [isOpen, setIsOpen] = useState(false);
    const [name, setName] = useState("");
    const createMutation = useCreateCategoryMutation();

    const handleSubmit = useCallback(
        async (e: React.FormEvent): Promise<void> => {
            e.preventDefault();
            if (name.trim() === "") return;
            await createMutation.mutateAsync({ name: name.trim() });
            setName("");
            setIsOpen(false);
        },
        [name, createMutation],
    );

    if (!isOpen) {
        return (
            <button
                type="button"
                onClick={(): void => setIsOpen(true)}
                className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-3 text-xs font-medium text-slate-500 transition hover:border-slate-400 hover:text-slate-700"
            >
                + New Category
            </button>
        );
    }

    return (
        <form
            onSubmit={(e): void => void handleSubmit(e)}
            className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
        >
            <input
                type="text"
                value={name}
                onChange={(e): void => setName(e.target.value)}
                placeholder="Category name"
                autoFocus
                className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
            />
            <div className="flex gap-2">
                <button
                    type="submit"
                    disabled={name.trim() === "" || createMutation.isPending}
                    className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {createMutation.isPending ? "Creating..." : "Create"}
                </button>
                <button
                    type="button"
                    onClick={(): void => {
                        setIsOpen(false);
                        setName("");
                    }}
                    className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                >
                    Cancel
                </button>
            </div>
        </form>
    );
}
