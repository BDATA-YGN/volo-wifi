/** Mount target for Ant Design overlays (Tooltip, Dropdown, etc.). */
export type OverlayPopupContainer = HTMLElement | ShadowRoot;

/**
 * Popup container for Ant Design overlays (Tooltip, Dropdown, Select, etc.).
 * Keeps popups in the same shadow root as the trigger when needed — avoids:
 * "trigger element and popup element should in same shadow root".
 */
export function getOverlayPopupContainer(
  triggerNode?: HTMLElement
): OverlayPopupContainer {
  if (!triggerNode) {
    return document.body;
  }

  const root = triggerNode.getRootNode();
  if (root instanceof ShadowRoot) {
    return root;
  }

  const tableWrapper = triggerNode.closest(".ant-table-wrapper");
  if (tableWrapper instanceof HTMLElement) {
    return tableWrapper;
  }

  return document.body;
}

/** @deprecated Use `getOverlayPopupContainer` */
export const getTablePopupContainer = getOverlayPopupContainer;
