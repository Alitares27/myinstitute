const locks = new Set<symbol>();
let originalOverflow = "";
let originalRootOverflowY = "";
export function lockBodyScroll(): () => void {
  const token = Symbol("modal-scroll");
  if (!locks.size) { originalOverflow = document.body.style.overflow; originalRootOverflowY = document.documentElement.style.overflowY; }
  locks.add(token);
  document.body.style.overflow = "hidden";
  document.documentElement.style.overflowY = "hidden";
  return () => {
    if (!locks.delete(token)) return;
    if (!locks.size) { document.body.style.overflow = originalOverflow; document.documentElement.style.overflowY = originalRootOverflowY; }
  };
}
