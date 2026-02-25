/**
 * DragOverlay Component
 * 
 * Z-INDEX STRATEGY:
 * - Rendered via React Portal to document.body
 * - Uses z-index: 99999 to float above ALL other elements
 * - Position: fixed ensures it's not affected by any parent transforms
 * - Pointer-events: none prevents interference with drop detection
 */

import React from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Table, Folder } from "lucide-react";
import type { DragItem } from "@/hooks/useDragAndDrop";

interface DragOverlayProps {
  item: DragItem | null;
  x: number;
  y: number;
  isDragging: boolean;
}

const DragOverlay: React.FC<DragOverlayProps> = ({ item, x, y, isDragging }) => {
  if (!isDragging || !item) return null;

  const overlay = (
    <AnimatePresence>
      <motion.div
        key="drag-overlay"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1.05, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className="fixed pointer-events-none select-none"
        style={{
          left: x - 45,
          top: y - 45,
          zIndex: 99999, // Above everything
          willChange: "transform",
        }}
      >
        <div className="flex flex-col items-center justify-center w-[90px] min-h-[90px] p-2 rounded-2xl bg-card/95 backdrop-blur-xl border border-primary/40 shadow-2xl">
          {/* Glow effect */}
          <div 
            className="absolute inset-0 rounded-2xl opacity-60"
            style={{
              background: "radial-gradient(circle at center, rgba(59,130,246,0.25) 0%, transparent 70%)",
              filter: "blur(8px)",
            }}
          />
          
          {/* Icon */}
          <div className="relative z-10 mb-1">
            {item.type === "folder" ? (
              <Folder size={40} className="text-primary" strokeWidth={1.5} />
            ) : item.type === "document" ? (
              <FileText size={40} className="text-blue-400" strokeWidth={1.5} />
            ) : (
              <Table size={40} className="text-emerald-500" strokeWidth={1.5} />
            )}
          </div>
          
          {/* Title */}
          <span className="relative z-10 text-[11px] text-foreground/90 text-center max-w-[80px] truncate font-medium">
            {item.title}
          </span>
        </div>
      </motion.div>
    </AnimatePresence>
  );

  return createPortal(overlay, document.body);
};

export default DragOverlay;
