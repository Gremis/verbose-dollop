import { JournalRow } from "@/app/(app)/journal/journal-client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export default function DropdownActions({
  r,
  openEdit,
  askDelete,
  onQuickClose,
}: {
  r: JournalRow;
  openEdit: (r: JournalRow) => void;
  askDelete: (id: string) => void;
  onQuickClose?: (r: JournalRow) => void;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const [pos, setPos] = useState<{ top: number; left: number; width: number }>({
    top: 0,
    left: 0,
    width: 160,
  });

  useEffect(() => {
    if (!open) return;

    const update = () => {
      const el = btnRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const menuWidth = 180;

      // alinha o menu à direita do botão
      const left = Math.max(8, rect.right - menuWidth);
      const top = rect.bottom + 8;

      setPos({ top, left, width: menuWidth });
    };

    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);

    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (btnRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };

    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div className="relative inline-block text-left">
      <button
        ref={btnRef}
        type="button"
        aria-label="Open trade actions"
        onClick={(e) => {
          e.stopPropagation(); // impede trigger do toggleRow no <Tr>
          setOpen((v) => !v);
        }}
        className="grid h-[34px] w-[34px] place-items-center rounded-[9px] border border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50 cursor-pointer"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <circle cx="5" cy="12" r="1" fill="currentColor" />
          <circle cx="12" cy="12" r="1" fill="currentColor" />
          <circle cx="19" cy="12" r="1" fill="currentColor" />
        </svg>
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            style={{ top: pos.top, left: pos.left, width: pos.width }}
            className="fixed rounded-xl shadow-lg bg-white ring-1 ring-black/5 z-[9999]"
            onClick={(e) => e.stopPropagation()} // não colapsar a linha ao clicar no menu
          >
            {onQuickClose && (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onQuickClose(r);
                }}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50 cursor-pointer border-b border-gray-100"
              >
                Quick Close
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setOpen(false);
                openEdit(r);
              }}
              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 cursor-pointer"
            >
              Edit
            </button>

            <button
              type="button"
              onClick={() => {
                setOpen(false);
                askDelete(r.id);
              }}
              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50 cursor-pointer"
            >
              Delete
            </button>
          </div>,
          document.body
        )}
    </div>
  );
}
