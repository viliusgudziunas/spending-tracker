import { useContext } from "react";
import { RulesContext, RulesContextType } from "../contexts/RulesContext";

const useRules = (): RulesContextType => useContext(RulesContext);

export default useRules;
