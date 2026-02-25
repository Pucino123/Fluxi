/**
 * Unified Drag & Drop System
 * 
 * ARCHITECTURE:
 * - Uses pointer events (not HTML5 DnD) for smooth, consistent behavior
 * - Drag overlay rendered via React Portal at document.body level
 * - Z-index strategy: dragged items at z-9999 to float above everything
 * - Drop targets detected via element position matching during drag
 * 
 * This approach avoids common HTML5 DnD issues:
 * - No flickering or ghost image problems
 * - Consistent cross-browser behavior
 * - Better control over visual feedback
 */

import { useState, useCallback, useRef, useEffect } from "react";

export interface DragItem {
  id: string;
  type: "folder" | "document";
  title: string;
  icon?: React.ReactNode;
  sourceX: number;
  sourceY: number;
}

export interface DropTarget {
  id: string;
  type: "folder";
  rect: DOMRect;
}

interface DragState {
  item: DragItem | null;
  currentX: number;
  currentY: number;
  isDragging: boolean;
  dropTargetId: string | null;
}

const DRAG_THRESHOLD = 5; // pixels before drag starts

export function useDragAndDrop() {
  const [dragState, setDragState] = useState<DragState>({
    item: null,
    currentX: 0,
    currentY: 0,
    isDragging: false,
    dropTargetId: null,
  });

  const dropTargetsRef = useRef<Map<string, DropTarget>>(new Map());
  const startPosRef = useRef<{ x: number; y: number } | null>(null);
  const pendingDragRef = useRef<DragItem | null>(null);

  // Register a drop target
  const registerDropTarget = useCallback((id: string, type: "folder", element: HTMLElement | null) => {
    if (element) {
      const rect = element.getBoundingClientRect();
      dropTargetsRef.current.set(id, { id, type, rect });
    } else {
      dropTargetsRef.current.delete(id);
    }
  }, []);

  // Update drop target rects (call on scroll/resize)
  const updateDropTargetRects = useCallback(() => {
    dropTargetsRef.current.forEach((target, id) => {
      const element = document.querySelector(`[data-drop-target="${id}"]`);
      if (element) {
        target.rect = element.getBoundingClientRect();
      }
    });
  }, []);

  // Find drop target at position
  const findDropTarget = useCallback((x: number, y: number, excludeId?: string): string | null => {
    for (const [id, target] of dropTargetsRef.current) {
      if (id === excludeId) continue;
      const { rect } = target;
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
        return id;
      }
    }
    return null;
  }, []);

  // Start drag (called on pointerdown)
  const startDrag = useCallback((item: DragItem, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    startPosRef.current = { x: e.clientX, y: e.clientY };
    pendingDragRef.current = item;
    
    // Capture pointer for reliable tracking
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }, []);

  // Handle pointer move
  const handlePointerMove = useCallback((e: PointerEvent) => {
    const startPos = startPosRef.current;
    const pendingDrag = pendingDragRef.current;

    if (!startPos) return;

    const dx = e.clientX - startPos.x;
    const dy = e.clientY - startPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Check if we've passed the drag threshold
    if (!dragState.isDragging && pendingDrag && distance > DRAG_THRESHOLD) {
      setDragState({
        item: pendingDrag,
        currentX: e.clientX,
        currentY: e.clientY,
        isDragging: true,
        dropTargetId: null,
      });
    }

    // Update position if dragging
    if (dragState.isDragging || (pendingDrag && distance > DRAG_THRESHOLD)) {
      updateDropTargetRects();
      const dropTargetId = findDropTarget(e.clientX, e.clientY, pendingDrag?.id);
      
      setDragState(prev => ({
        ...prev,
        currentX: e.clientX,
        currentY: e.clientY,
        isDragging: true,
        dropTargetId,
      }));
    }
  }, [dragState.isDragging, findDropTarget, updateDropTargetRects]);

  // Handle pointer up - returns drop info
  const handlePointerUp = useCallback((): { item: DragItem; targetId: string } | null => {
    const result = dragState.isDragging && dragState.item && dragState.dropTargetId
      ? { item: dragState.item, targetId: dragState.dropTargetId }
      : null;

    // Reset all state
    startPosRef.current = null;
    pendingDragRef.current = null;
    setDragState({
      item: null,
      currentX: 0,
      currentY: 0,
      isDragging: false,
      dropTargetId: null,
    });

    return result;
  }, [dragState]);

  // Cancel drag
  const cancelDrag = useCallback(() => {
    startPosRef.current = null;
    pendingDragRef.current = null;
    setDragState({
      item: null,
      currentX: 0,
      currentY: 0,
      isDragging: false,
      dropTargetId: null,
    });
  }, []);

  // Global event listeners
  useEffect(() => {
    const onMove = (e: PointerEvent) => handlePointerMove(e);
    const onUp = () => handlePointerUp();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && dragState.isDragging) {
        cancelDrag();
      }
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [handlePointerMove, handlePointerUp, cancelDrag, dragState.isDragging]);

  return {
    dragState,
    startDrag,
    cancelDrag,
    handlePointerUp,
    registerDropTarget,
    isDropTarget: (id: string) => dragState.dropTargetId === id,
    isDragging: (id: string) => dragState.item?.id === id && dragState.isDragging,
  };
}
