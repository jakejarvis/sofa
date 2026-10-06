const OVERLAY_SELECTOR = '[role="dialog"], [role="alertdialog"], [role="menu"]';

/** True while any dialog, alert dialog, popover or menu is open on the page. */
export function isOverlayOpen(root: ParentNode = document): boolean {
  return root.querySelector(OVERLAY_SELECTOR) !== null;
}
