import { useState } from "react";
import Reports from "./Reports";
import Rules from "./Rules";

interface SideBarProps {
    isSidebarOpen: boolean;
    toggleSideBar: () => void;
}

enum Tab {
    Reports = "Reports",
    Rules = "Rules",
}

const SideBar: React.FC<SideBarProps> = ({ isSidebarOpen, toggleSideBar }) => {
    const [selectedTab, setSelectedTab] = useState<Tab | null>(null);

    const onReportsClick = (): void => {
        if (isSidebarOpen && selectedTab === Tab.Reports) {
            toggleSideBar();
            setSelectedTab(null);
        } else if (isSidebarOpen) {
            setSelectedTab(Tab.Reports);
        } else {
            toggleSideBar();
            setSelectedTab(Tab.Reports);
        }
    };

    const onRulesClick = (): void => {
        if (isSidebarOpen && selectedTab === Tab.Rules) {
            toggleSideBar();
            setSelectedTab(null);
        } else if (isSidebarOpen) {
            setSelectedTab(Tab.Rules);
        } else {
            toggleSideBar();
            setSelectedTab(Tab.Rules);
        }
    };

    const getSelectedTabComponent = (): JSX.Element => {
        switch (selectedTab) {
            case Tab.Reports:
                return <Reports />;
            case Tab.Rules:
                return <Rules />;
            default:
                return <></>;
        }
    };

    return (
        <div
            style={{
                width: "50%",
                position: "fixed",
                right: isSidebarOpen ? "0" : "-50%",
                top: "0",
                height: "100%",
                transition: "right 0.3s ease",
                display: "flex",
            }}
        >
            <div
                style={{
                    top: "5%",
                    position: "absolute",
                    transform: "translateX(-100%)",
                    display: "flex",
                    flexDirection: "column",
                    zIndex: 1,
                    gap: "8px",
                }}
            >
                <button onClick={onReportsClick}>Reports</button>
                <button onClick={onRulesClick}>Rules</button>
            </div>
            <div
                style={{
                    width: "100%",
                    backgroundColor: "#f4f4f4",
                    boxShadow: "-2px 0px 5px rgba(0,0,0,0.1)",
                    overflow: "auto",
                }}
            >
                {getSelectedTabComponent()}
            </div>
        </div>
    );
};

export default SideBar;
