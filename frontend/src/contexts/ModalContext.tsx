import { createContext, PropsWithChildren, ReactNode, useState } from "react";

export interface ModalContextType {
    actions: {
        showModal: (modalJSX: ReactNode) => void;
        hideModal: () => void;
    };
}

const defaultContext: ModalContextType = {
    actions: {
        showModal: () => {},
        hideModal: () => {},
    },
};

export const ModalContext = createContext<ModalContextType>(defaultContext);

export const ModalProvider: React.FC<PropsWithChildren> = ({ children }) => {
    const [modalContent, setModalContent] = useState<ReactNode>(null);

    const showModal = (modalJSX: ReactNode): void => {
        setModalContent(modalJSX);
    };

    const hideModal = (): void => {
        setModalContent(null);
    };

    return (
        <ModalContext.Provider
            value={{
                actions: {
                    showModal,
                    hideModal,
                },
            }}
        >
            {children}
            {modalContent && (
                <div
                    style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                        backgroundColor: "rgba(0, 0, 0, 0.5)",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        zIndex: 1000,
                    }}
                >
                    {modalContent}
                </div>
            )}
        </ModalContext.Provider>
    );
};
