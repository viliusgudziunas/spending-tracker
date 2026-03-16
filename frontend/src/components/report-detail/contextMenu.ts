interface MenuPosition {
    left: number;
    top: number;
}

const VIEWPORT_MARGIN_PX = 8;

function getContextMenuPosition({
    anchorX,
    anchorY,
    menuWidth,
    menuHeight,
    viewportWidth,
    viewportHeight,
}: {
    anchorX: number;
    anchorY: number;
    menuWidth: number;
    menuHeight: number;
    viewportWidth: number;
    viewportHeight: number;
}): MenuPosition {
    const maxLeft = Math.max(VIEWPORT_MARGIN_PX, viewportWidth - menuWidth - VIEWPORT_MARGIN_PX);
    const left = Math.min(Math.max(anchorX, VIEWPORT_MARGIN_PX), maxLeft);

    const hasSpaceBelow = anchorY + menuHeight + VIEWPORT_MARGIN_PX <= viewportHeight;
    if (hasSpaceBelow) {
        const maxTop = Math.max(VIEWPORT_MARGIN_PX, viewportHeight - menuHeight - VIEWPORT_MARGIN_PX);
        return {
            left,
            top: Math.min(Math.max(anchorY, VIEWPORT_MARGIN_PX), maxTop),
        };
    }

    return {
        left,
        top: Math.max(VIEWPORT_MARGIN_PX, anchorY - menuHeight),
    };
}

export { getContextMenuPosition };
