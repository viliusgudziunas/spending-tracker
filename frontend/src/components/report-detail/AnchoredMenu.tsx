import { type ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";

import { getContextMenuPosition } from "./contextMenu";

interface AnchoredMenuProps {
    x: number;
    y: number;
    onClose: () => void;
    children: ReactNode;
}

export default function AnchoredMenu({ x, y, onClose, children }: AnchoredMenuProps): JSX.Element {
    const menuRef = useRef<HTMLDivElement | null>(null);
    const [position, setPosition] = useState<{ left: number; top: number }>({ left: x, top: y });

    useEffect(() => {
        const handleOutsideClick = (event: MouseEvent): void => {
            const target = event.target as Node;
            if (menuRef.current?.contains(target)) return;
            onClose();
        };

        const handleEscape = (event: KeyboardEvent): void => {
            if (event.key !== "Escape") return;
            onClose();
        };

        window.addEventListener("mousedown", handleOutsideClick);
        window.addEventListener("keydown", handleEscape);
        return (): void => {
            window.removeEventListener("mousedown", handleOutsideClick);
            window.removeEventListener("keydown", handleEscape);
        };
    }, [onClose]);

    useLayoutEffect(() => {
        const menu = menuRef.current;
        if (menu === null) return;

        const rect = menu.getBoundingClientRect();
        setPosition(
            getContextMenuPosition({
                anchorX: x,
                anchorY: y,
                menuWidth: rect.width,
                menuHeight: rect.height,
                viewportWidth: window.innerWidth,
                viewportHeight: window.innerHeight,
            }),
        );
    }, [x, y]);

    return (
        <div
            ref={menuRef}
            className="fixed z-50 min-w-[220px] rounded-md border border-slate-200 bg-white p-1 shadow-xl"
            style={{ left: position.left, top: position.top }}
        >
            {children}
        </div>
    );
}
