/**
 * Desktop Drag Context
 * 
 * A complete drag-and-drop system that bypasses native HTML5 DnD
 * for instant, lag-free response matching the Lovable reference.
 * 
 * KEY FEATURES:
 * - Pointer events for instant response (no native DnD lag)
 * - Custom drag overlay rendered via portal at z-index 99999
 * - Original item dims during drag
 * - Precise hitbox detection with expanded areas
 * - Instant visual feedback on drop targets
 */

import React, { createContext, useContext, useState, useCallback, useRef, useEffect, ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Folder, FileText, Table } from "lucide-react";

// Types
export interface DragItem {
  id: string;
  type: "folder" | "document";
  title: string;
  color?: string;
  docType?: "text" | "spreadsheet";
}

interface DropTargetInfo {
  id: string;
  element: HTMLElement;
  type: "folder";
}

interface DragContextValue {
  // State
  dragItem: DragItem | null;
  isDragging: boolean;
  dropTargetId: string | null;
  
  // Actions
  startDrag: (item: DragItem, e: React.PointerEvent) => void;
  registerDropTarget: (id: string, element: HTMLElement | null) => void;
  
  // Helpers
  isDraggedItem: (id: string) => boolean;
  isDropTarget: (id: string) => boolean;
}

const DragContext = createContext<DragContextValue | null>(null);

// Drag Overlay Component - Renders the floating card during drag
const DragOverlay: React.FC<{
  item: DragItem | null;
  x: number;
  y: number;
  isDragging: boolean;
}> = ({ item, x, y, isDragging }) => {
  if (!isDragging || !item) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="drag-overlay"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1.05, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", stiffness: 500, damping: 30, mass: 0.5 }}
        style={{
          position: "fixed",
          left: x - 45,
          top: y - 50,
          zIndex: 99999,
          pointerEvents: "none",
          willChange: "transform",
        }}
      >
        <div 
          className="flex flex-col items-center justify-center w-[90px] min-h-[95px] p-2 rounded-2xl border-2"
          style={{
            background: "rgba(25, 25, 35, 0.95)",
            backdropFilter: "blur(20px)",
            borderColor: "rgba(59, 130, 246, 0.5)",
            boxShadow: `
              0 25px 50px -12px rgba(0, 0, 0, 0.5),
              0 0 0 1px rgba(255, 255, 255, 0.1),
              0 0 40px rgba(59, 130, 246, 0.3)
            `,
          }}
        >
          {/* Icon */}
          <div className="mb-1.5">
            {item.type === "folder" ? (
              <Folder 
                size={42} 
                style={{ 
                  color: item.color || "hsl(var(--muted-foreground))",
                  fill: item.color || "hsl(var(--muted-foreground))",
                  fillOpacity: 0.7,
                }} 
                strokeWidth={1.8}
              />
            ) : item.docType === "spreadsheet" ? (
              <Table size={42} className="text-emerald-400" strokeWidth={1.5} />
            ) : (
              <FileText size={42} className="text-blue-400" strokeWidth={1.5} />
            )}
          </div>
          
          {/* Title */}
          <span 
            className="text-[11px] font-medium text-center max-w-[80px] truncate"
            style={{ color: "rgba(255, 255, 255, 0.9)" }}
          >
            {item.title}
          </span>
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};

// Provider Component
export const DesktopDragProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [dragItem, setDragItem] = useState<DragItem | null>(null);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  
  const dropTargetsRef = useRef<Map<string, DropTargetInfo>>(new Map());
  const isDraggingRef = useRef(false);
  const frameRef = useRef<number>(0);

  // Find which drop target the cursor is over
  const findDropTarget = useCallback((x: number, y: number): string | null => {
    for (const [id, target] of dropTargetsRef.current) {
      if (dragItem && id === dragItem.id) continue; // Can't drop on self
      
      const rect = target.element.getBoundingClientRect();
      // Expanded hitbox (+15px padding for easier targeting)
      const padding = 15;
      if (
        x >= rect.left - padding &&
        x <= rect.right + padding &&
        y >= rect.top - padding &&
        y <= rect.bottom + padding
      ) {
        return id;
      }
    }
    return null;
  }, [dragItem]);

  // Handle pointer move - uses requestAnimationFrame for smooth 60fps updates
  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!isDraggingRef.current) return;
    
    // Cancel any pending frame
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    
    // Schedule update on next frame for smooth animation
    frameRef.current = requestAnimationFrame(() => {
      setCursorPos({ x: e.clientX, y: e.clientY });
      
      // Update drop targets after rects might have changed (scroll, etc)
      dropTargetsRef.current.forEach((target, id) => {
        const el = document.querySelector(`[data-drop-target="${id}"]`) as HTMLElement;
        if (el) target.element = el;
      });
      
      const targetId = findDropTarget(e.clientX, e.clientY);
      setDropTargetId(targetId);
    });
  }, [findDropTarget]);

  // Handle pointer up - complete the drag
  const handlePointerUp = useCallback(() => {
    if (!isDraggingRef.current) return;
    
    isDraggingRef.current = false;
    
    // Dispatch drop event if we have a target
    if (dragItem && dropTargetId) {
      window.dispatchEvent(new CustomEvent("desktop-drop", {
        detail: {
          item: dragItem,
          targetId: dropTargetId,
        },
      }));
    }
    
    // Reset state
    setDragItem(null);
    setDropTargetId(null);
  }, [dragItem, dropTargetId]);

  // Handle escape to cancel
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape" && isDraggingRef.current) {
      isDraggingRef.current = false;
      setDragItem(null);
      setDropTargetId(null);
    }
  }, []);

  // Global event listeners
  useEffect(() => {
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("blur", handlePointerUp); // Handle window losing focus
    
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("blur", handlePointerUp);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [handlePointerMove, handlePointerUp, handleKeyDown]);

  // Start drag
  const startDrag = useCallback((item: DragItem, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    isDraggingRef.current = true;
    setDragItem(item);
    setCursorPos({ x: e.clientX, y: e.clientY });
    setDropTargetId(null);
    
    // Capture pointer for reliable tracking even outside window
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }, []);

  // Register a drop target
  const registerDropTarget = useCallback((id: string, element: HTMLElement | null) => {
    if (element) {
      dropTargetsRef.current.set(id, { id, element, type: "folder" });
    } else {
      dropTargetsRef.current.delete(id);
    }
  }, []);

  const value: DragContextValue = {
    dragItem,
    isDragging: isDraggingRef.current && dragItem !== null,
    dropTargetId,
    startDrag,
    registerDropTarget,
    isDraggedItem: (id) => dragItem?.id === id,
    isDropTarget: (id) => dropTargetId === id,
  };

  return (
    <DragContext.Provider value={value}>
      {children}
      <DragOverlay 
        item={dragItem} 
        x={cursorPos.x} 
        y={cursorPos.y} 
        isDragging={dragItem !== null}
      />
    </DragContext.Provider>
  );
};

// Hook to use the drag context
export const useDesktopDrag = () => {
  const ctx = useContext(DragContext);
  if (!ctx) throw new Error("useDesktopDrag must be used within DesktopDragProvider");
  return ctx;
};
