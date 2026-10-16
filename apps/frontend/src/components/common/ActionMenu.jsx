"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MoreVertical } from "lucide-react";

export default function ActionMenu({
  items = [], // [{ label, onClick, icon: Icon, danger }]
  className = "",
}) {
  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  useLayoutEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      const trigger = triggerRef.current;
      const menu = menuRef.current;
      if (!trigger || !menu) return;

      const triggerRect = trigger.getBoundingClientRect();
      const menuRect = menu.getBoundingClientRect();
      const spaceBelow = window.innerHeight - triggerRect.bottom;
      const spaceAbove = triggerRect.top;
      const placeAbove =
        spaceBelow < menuRect.height + 8 && spaceAbove > spaceBelow;
      const top = placeAbove
        ? triggerRect.top - menuRect.height - 8
        : triggerRect.bottom + 8;
      const left = Math.min(
        Math.max(8, triggerRect.right - menuRect.width),
        window.innerWidth - menuRect.width - 8,
      );

      setMenuPosition({
        top: Math.max(8, Math.min(top, window.innerHeight - menuRect.height - 8)),
        left,
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, items.length]);

  // close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        !triggerRef.current?.contains(e.target) &&
        !menuRef.current?.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // close on ESC
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className={`relative inline-block text-left ${className}`}>
      {/* Trigger */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="p-2 rounded-full hover:bg-slate-100 transition"
      >
        <MoreVertical size={18} className="text-gray-600" />
      </button>

      {/* Menu */}
      {open && typeof document !== "undefined" &&
        createPortal(
        <div
          ref={menuRef}
          style={{ position: "fixed", top: menuPosition.top, left: menuPosition.left }}
          className="w-40 rounded-xl bg-white border border-gray-200 shadow-lg z-50"
        >
          <ul className="py-1 text-sm">
            {items.map((item, idx) => {
              const Icon = item.icon;
              return (
                <li key={idx}>
                  <button
                    type="button"
                    onClick={() => {
                      item.onClick?.();
                      setOpen(false);
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-slate-50 transition
                      ${item.danger ? "text-red-600 hover:bg-red-50" : "text-gray-700"}`}
                  >
                    {Icon && <Icon size={16} />}
                    {item.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>,
        document.body,
      )}
    </div>
  );
}