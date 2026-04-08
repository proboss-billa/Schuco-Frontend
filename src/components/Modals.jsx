"use client";
import { useState, useEffect } from "react";
import { C, F, inputBase, fB, bB } from "@/lib/design";
import { EditIcon, TrashIcon } from "@/components/Icons";

const menuBtn = (onClick, label, icon, danger = false) => (
  <button onClick={onClick}
    style={{ width: "100%", padding: "9px 12px", background: "none", border: "none", color: danger ? C.err : C.text1, cursor: "pointer", fontSize: 13, fontFamily: F.sans, display: "flex", alignItems: "center", gap: 8, borderRadius: 6 }}
    onMouseEnter={e => e.currentTarget.style.background = danger ? "rgba(255,90,90,0.08)" : C.bg3}
    onMouseLeave={e => e.currentTarget.style.background = "none"}>
    {icon} {label}
  </button>
);

export function ChatCtxMenu({ x, y, isArchived, isStarred, onOpen, onRename, onStar, onArchive, onUnarchive, onDelete, onClose }) {
  useEffect(() => {
    const h = () => onClose();
    const t = setTimeout(() => document.addEventListener("click", h), 10);
    return () => { clearTimeout(t); document.removeEventListener("click", h); };
  }, [onClose]);

  const menuStyle = { position: "fixed", left: x, top: y, zIndex: 500, background: C.bg2, border: `1px solid ${C.border2}`, borderRadius: 10, padding: 4, minWidth: 170, boxShadow: "0 8px 30px rgba(0,0,0,0.4)", animation: "fadeUp .15s ease", fontFamily: F.sans };

  if (isArchived) {
    return (
      <div style={menuStyle}>
        {menuBtn(onUnarchive, "Restore", <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>)}
        {menuBtn(onDelete, "Delete Permanently", <TrashIcon />, true)}
      </div>
    );
  }

  return (
    <div style={menuStyle}>
      {menuBtn(onOpen, "Open", <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>)}
      {menuBtn(onStar, isStarred ? "Remove from Favourites" : "Star to Favourites", <svg width="14" height="14" viewBox="0 0 24 24" fill={isStarred ? "#FFB340" : "none"} stroke={isStarred ? "#FFB340" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>)}
      {menuBtn(onArchive, "Archive Project", <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>)}
      {menuBtn(onRename, "Rename", <EditIcon />)}
    </div>
  );
}

export function RenameModal({ name, onSave, onClose }) {
  const [v, setV] = useState(name);
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 600, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F.sans }}>
      <div style={{ background: C.bg1, borderRadius: 14, padding: 24, width: 380, border: `1px solid ${C.border2}`, boxShadow: "0 16px 48px rgba(0,0,0,0.5)", animation: "fadeUp .2s ease" }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 600, color: C.text1 }}>Rename Chat</h3>
        <input style={inputBase} value={v} onChange={e => setV(e.target.value)} autoFocus onFocus={fB} onBlur={bB}
          onKeyDown={e => e.key === "Enter" && onSave(v)} />
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 18 }}>
          <button onClick={onClose} style={{ padding: "9px 18px", background: "transparent", border: `1px solid ${C.border}`, borderRadius: 8, color: C.text2, cursor: "pointer", fontSize: 13, fontFamily: F.sans }}>Cancel</button>
          <button onClick={() => onSave(v)} style={{ padding: "9px 18px", background: C.green, border: "none", borderRadius: 8, color: "#111", cursor: "pointer", fontSize: 13, fontFamily: F.sans, fontWeight: 700 }}>Save</button>
        </div>
      </div>
    </div>
  );
}

export function DeleteModal({ name, onConfirm, onClose }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 600, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F.sans }}>
      <div style={{ background: C.bg1, borderRadius: 14, padding: 24, width: 380, border: `1px solid ${C.border2}`, boxShadow: "0 16px 48px rgba(0,0,0,0.5)", animation: "fadeUp .2s ease" }}>
        <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 600, color: C.text1 }}>Delete project?</h3>
        <p style={{ margin: "0 0 20px", fontSize: 13, color: C.text2, lineHeight: 1.5 }}>
          <strong style={{ color: C.text1 }}>{name}</strong> and all its documents, extractions, and chat history will be permanently deleted.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "9px 18px", background: "transparent", border: `1px solid ${C.border}`, borderRadius: 8, color: C.text2, cursor: "pointer", fontSize: 13, fontFamily: F.sans }}>Cancel</button>
          <button onClick={onConfirm} style={{ padding: "9px 18px", background: C.err, border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontSize: 13, fontFamily: F.sans, fontWeight: 700 }}>Delete</button>
        </div>
      </div>
    </div>
  );
}

export function DeleteDocumentsModal({ count, onConfirm, onClose }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 600, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F.sans }}>
      <div style={{ background: C.bg1, borderRadius: 14, padding: 24, width: 380, border: `1px solid ${C.border2}`, boxShadow: "0 16px 48px rgba(0,0,0,0.5)", animation: "fadeUp .2s ease" }}>
        <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 600, color: C.text1 }}>Delete {count} document{count !== 1 ? "s" : ""}?</h3>
        <p style={{ margin: "0 0 20px", fontSize: 13, color: C.text2, lineHeight: 1.5 }}>
          Associated vectors and source references will be removed. Extracted parameters will be updated.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "9px 18px", background: "transparent", border: `1px solid ${C.border}`, borderRadius: 8, color: C.text2, cursor: "pointer", fontSize: 13, fontFamily: F.sans }}>Cancel</button>
          <button onClick={onConfirm} style={{ padding: "9px 18px", background: C.err, border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontSize: 13, fontFamily: F.sans, fontWeight: 700 }}>Delete</button>
        </div>
      </div>
    </div>
  );
}
