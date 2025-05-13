import { useContext } from "react";
import { ModalContext, ModalContextType } from "../contexts/ModalContext";

const useModal = (): ModalContextType => useContext(ModalContext);

export default useModal;
