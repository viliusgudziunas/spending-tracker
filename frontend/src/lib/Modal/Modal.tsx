import React, { PropsWithChildren } from "react";
import "./Modal.css";

const Modal: React.FC<PropsWithChildren> = ({ children }) => {
    return (
        <div className="modal-overlay">
            <div className="modal">{children}</div>
        </div>
    );
};

export default Modal;
