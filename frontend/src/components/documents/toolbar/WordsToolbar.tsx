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

  // Save position on change - for floating toolbar
  const handleToolbarDragEnd = useCallback((event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
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

  const onSegmentDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      handleReorder(active.id as string, over.id as string);
    }
    setActiveId(null);
  };

  const onSegmentDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  return (
    <motion.div
      ref={toolbarRef}
      style={isFloating ? { x: springX, y: springY } : undefined}
      drag={isFloating && !isPinned}
      dragMomentum={true}
      dragElastic={0.1}
      onDragEnd={handleDragEnd}
      whileDrag={{ scale: 1.02, cursor: "grabbing" }}
      className={`flex flex-wrap items-center gap-1.5 px-2 py-2 border transition-all duration-300 ${
        isFloating
          ? `fixed top-4 left-1/2 -translate-x-1/2 z-[200] rounded-2xl ${lm ? "bg-white/95 border-gray-200/60" : "bg-popover/95 border-border/30"} backdrop-blur-xl shadow-2xl max-w-[95vw] cursor-grab`
          : studioMode
            ? `fixed top-4 left-1/2 -translate-x-1/2 z-[200] rounded-2xl ${lm ? "bg-white/95 border-gray-200/60" : "bg-popover/95 border-border/30"} backdrop-blur-xl shadow-2xl max-w-[95vw]`
            : lm ? "border-gray-200 bg-transparent" : "border-white/[0.08] bg-transparent"
      }`}
    >
      {/* Float/Pin controls */}
      <div className="flex items-center gap-0.5 pr-1.5 border-r border-border/30 mr-1">
        <button
          onClick={toggleFloating}
          className={`p-1.5 rounded-lg transition-all ${
            isFloating
              ? lm ? "bg-blue-50 text-blue-600" : "bg-primary/15 text-primary"
              : lm ? "hover:bg-gray-100 text-gray-400" : "hover:bg-secondary/60 text-muted-foreground/60"
          }`}
          title={isFloating ? "Dock toolbar" : "Float toolbar"}
        >
          <GripVertical size={14} />
        </button>
        {isFloating && (
          <button
            onClick={() => setIsPinned(!isPinned)}
            className={`p-1.5 rounded-lg transition-all ${
              isPinned
                ? lm ? "bg-amber-50 text-amber-600" : "bg-amber-500/15 text-amber-400"
                : lm ? "hover:bg-gray-100 text-gray-400" : "hover:bg-secondary/60 text-muted-foreground/60"
            }`}
            title={isPinned ? "Unpin toolbar" : "Pin toolbar"}
          >
            {isPinned ? <Pin size={12} /> : <PinOff size={12} />}
          </button>
        )}
      </div>

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
    </motion.div>
  );
};

export default WordsToolbar;
