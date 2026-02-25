import React, { useState, useRef, useEffect, useCallback } from "react";
import { AnimatePresence, motion, useMotionValue, useSpring, PanInfo } from "framer-motion";
import { DndContext, closestCenter, DragEndEvent, DragOverlay, useSensor, useSensors, PointerSensor } from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import { useToolbarOrder } from "@/hooks/useToolbarOrder";
import { GripVertical, Pin, PinOff } from "lucide-react";
import FileMenu from "./FileMenu";
import TypographyPanel from "./TypographyPanel";
import StructureTools from "./StructureTools";
import InsertMenu from "./InsertMenu";
import AiToolsPanel from "./AiToolsPanel";
import ViewModeToggle from "./ViewModeToggle";
import EmojiTouchbar from "./EmojiTouchbar";
import ToolbarSegment from "./ToolbarSegment";

interface WordsToolbarProps {
  editorRef: React.RefObject<HTMLDivElement>;
  onContentChange: () => void;
  exec: (cmd: string, value?: string) => void;
  renaming: boolean;
  setRenaming: (v: boolean) => void;
  renameValue: string;
  setRenameValue: (v: string) => void;
  commitRename: () => void;
  documentTitle: string;
  confirmDelete: boolean;
  setConfirmDelete: (v: boolean) => void;
  onDelete: () => void;
  studioMode: boolean;
  onToggleStudio: () => void;
  zoom: number;
  onZoomChange: (z: number) => void;
  lightMode?: boolean;
  documentLightMode?: boolean;
  onToggleDocumentTheme?: () => void;
}

const DEFAULT_ORDER = ["file", "typography", "structure", "insert", "emoji", "ai", "view"];

const WordsToolbar = ({
  editorRef, onContentChange, exec, renaming, setRenaming, renameValue, setRenameValue,
  commitRename, documentTitle, confirmDelete, setConfirmDelete, onDelete,
  studioMode, onToggleStudio, zoom, onZoomChange, lightMode = false,
  documentLightMode, onToggleDocumentTheme,
}: WordsToolbarProps) => {
  const lm = lightMode;
  const { order, handleReorder } = useToolbarOrder("flux-words-toolbar-order", DEFAULT_ORDER);
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [isFloating, setIsFloating] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);

  // Spring physics for smooth dragging
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springConfig = { damping: 25, stiffness: 300, mass: 0.8 };
  const springX = useSpring(x, springConfig);
  const springY = useSpring(y, springConfig);

  // Load saved position
  useEffect(() => {
    const savedPos = localStorage.getItem("flux-words-toolbar-pos");
    const savedFloating = localStorage.getItem("flux-words-toolbar-floating");
    if (savedPos) {
      try {
        const { px, py } = JSON.parse(savedPos);
        x.set(px);
        y.set(py);
      } catch {}
    }
    if (savedFloating === "true") {
      setIsFloating(true);
    }
  }, []);

  // Save position on change
  const handleDragEnd = useCallback((event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const newX = x.get() + info.offset.x;
    const newY = y.get() + info.offset.y;
    
    // Boundary constraints
    const bounds = {
      left: -window.innerWidth * 0.3,
      right: window.innerWidth * 0.3,
      top: -window.innerHeight * 0.3,
      bottom: window.innerHeight * 0.5,
    };
    
    const clampedX = Math.max(bounds.left, Math.min(bounds.right, newX));
    const clampedY = Math.max(bounds.top, Math.min(bounds.bottom, newY));
    
    x.set(clampedX);
    y.set(clampedY);
    
    localStorage.setItem("flux-words-toolbar-pos", JSON.stringify({ px: clampedX, py: clampedY }));
  }, [x, y]);

  const toggleFloating = useCallback(() => {
    const newFloating = !isFloating;
    setIsFloating(newFloating);
    localStorage.setItem("flux-words-toolbar-floating", String(newFloating));
    if (!newFloating) {
      x.set(0);
      y.set(0);
      localStorage.setItem("flux-words-toolbar-pos", JSON.stringify({ px: 0, py: 0 }));
    }
  }, [isFloating, x, y]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
        tolerance: 5,
      },
    })
  );

  const segmentMap: Record<string, React.ReactNode> = {
    file: (
      <ToolbarSegment key="file" id="file" sortable>
        <FileMenu
          renaming={renaming} setRenaming={setRenaming} renameValue={renameValue} setRenameValue={setRenameValue}
          commitRename={commitRename} documentTitle={documentTitle} confirmDelete={confirmDelete} setConfirmDelete={setConfirmDelete}
          onDelete={onDelete} exec={exec} editorRef={editorRef} lightMode={lm}
        />
      </ToolbarSegment>
    ),
    typography: (
      <ToolbarSegment key="typography" id="typography" sortable>
        <TypographyPanel exec={exec} lightMode={lm} />
      </ToolbarSegment>
    ),
    structure: (
      <ToolbarSegment key="structure" id="structure" sortable>
        <StructureTools exec={exec} editorRef={editorRef} lightMode={lm} />
      </ToolbarSegment>
    ),
    insert: (
      <ToolbarSegment key="insert" id="insert" sortable>
        <InsertMenu exec={exec} lightMode={lm} />
      </ToolbarSegment>
    ),
    emoji: (
      <ToolbarSegment key="emoji" id="emoji" sortable>
        <EmojiTouchbar onInsert={(emoji) => exec("insertText", emoji)} lightMode={lm} />
      </ToolbarSegment>
    ),
    ai: (
      <ToolbarSegment key="ai" id="ai" sortable>
        <AiToolsPanel editorRef={editorRef} onContentChange={onContentChange} lightMode={lm} />
      </ToolbarSegment>
    ),
    view: (
      <ToolbarSegment key="view" id="view" sortable>
        <ViewModeToggle
          studioMode={studioMode} onToggleStudio={onToggleStudio}
          zoom={zoom} onZoomChange={onZoomChange} lightMode={lm}
          documentLightMode={documentLightMode}
          onToggleDocumentTheme={onToggleDocumentTheme}
        />
      </ToolbarSegment>
    ),
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      handleReorder(active.id as string, over.id as string);
    }
    setActiveId(null);
  };

  const onDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  return (
    <div className={`flex flex-wrap items-center gap-1.5 px-2 py-2 border-b transition-colors ${
      studioMode
        ? "fixed top-4 left-1/2 -translate-x-1/2 z-[200] rounded-2xl bg-popover/95 backdrop-blur-xl border-border/30 shadow-2xl max-w-[95vw]"
        : lm ? "border-gray-200 bg-transparent" : "border-white/[0.08] bg-transparent"
    }`}>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <SortableContext items={order} strategy={horizontalListSortingStrategy}>
          <AnimatePresence mode="sync">
            {order.map(id => segmentMap[id])}
          </AnimatePresence>
        </SortableContext>
        <DragOverlay dropAnimation={{
          duration: 200,
          easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
        }}>
          {activeId ? (
            <div className="opacity-95 scale-110 cursor-grabbing shadow-2xl">
              {segmentMap[activeId]}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
};

export default WordsToolbar;
