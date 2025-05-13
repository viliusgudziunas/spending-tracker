import { useEffect } from "react";
import useModal from "../hooks/useModal";
import useRules from "../hooks/useRules";
import CreateCategoryModal from "./CreateCategoryModal";
import RulesCategory from "./RulesCategory";

const Rules: React.FC = () => {
    const rulesStore = useRules();
    const modalStore = useModal();

    useEffect(() => {
        const _fetchCategories = async (): Promise<void> => await rulesStore.actions.fetchCategories();

        _fetchCategories();
    }, []);

    const createCategory = (): void => modalStore.actions.showModal(<CreateCategoryModal />);

    return (
        <div style={{ margin: "12px" }}>
            <h1>Rules</h1>
            <button onClick={createCategory}>Create Category</button>
            <table style={{ marginTop: "12px" }}>
                <colgroup>
                    <col />
                </colgroup>
                <thead>
                    <tr>
                        <th style={{ backgroundColor: "#e9ecef" }}>Category</th>
                    </tr>
                </thead>
                <tbody>
                    {rulesStore.state.categories.map((category) => (
                        <RulesCategory key={category.id} category={category} />
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default Rules;
