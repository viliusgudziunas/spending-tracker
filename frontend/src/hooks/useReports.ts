import { useContext } from "react";
import { ReportsContext, ReportsContextType } from "../contexts/ReportsContext";

const useReports = (): ReportsContextType => useContext(ReportsContext);

export default useReports;
