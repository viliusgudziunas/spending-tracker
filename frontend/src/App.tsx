import { useState } from "react";
import MainSection from "./components/MainSection";
import SideBar from "./components/SideBar";

function App(): JSX.Element {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const toggleSidebar = (): void => setIsSidebarOpen(!isSidebarOpen);

    return (
        <div style={{ display: "flex", position: "relative" }}>
            <div style={{ flex: 1 }}>
                <MainSection />
            </div>
            <SideBar isSidebarOpen={isSidebarOpen} toggleSideBar={toggleSidebar} />
        </div>
    );
}

export default App;
