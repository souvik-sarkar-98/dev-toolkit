let openSheetCount = 0;

/** Hides the mobile bottom nav while a full-screen drawer/sheet is open. */
export function setMobileSheetOpen(open: boolean): void {
  if (typeof document === 'undefined') {
    return;
  }

  openSheetCount = open
    ? openSheetCount + 1
    : Math.max(0, openSheetCount - 1);

  document.body.classList.toggle('mobile-sheet-open', openSheetCount > 0);
}
