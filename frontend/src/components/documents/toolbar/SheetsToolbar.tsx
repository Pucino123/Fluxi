import React, { useState, useRef, useEffect, useCallback } from "react";
import { Bold, Italic, Underline, Strikethrough, AlignLeft, AlignCenter, AlignRight, Palette, PaintBucket, ArrowDownAZ, ArrowUpAZ, Filter, Download, GripVertical, Pin, PinOff } from "lucide-react";
import { AnimatePresence, motion, useMotionValue, useSpring, PanInfo } from "framer-motion";
import { DndContext, closestCenter, DragEndEvent, DragOverlay, useSensor, useSensors, PointerSensor } from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import { useToolbarOrder } from "@/hooks/useToolbarOrder";
import ToolbarSegment from "./ToolbarSegment";
import ToolbarButton from "./ToolbarButton";
import ColorPickerPopover from "./ColorPickerPopover";
import FileMenu from "./FileMenu";
import ViewModeToggle from "./ViewModeToggle";
import EmojiTouchbar from "./EmojiTouchbar";

interface SheetsToolbarProps {
  onBoldToggle: () => void;
  onItalicToggle: () => void;
  onUnderlineToggle: () => void;
  onStrikethroughToggle: () => void;
  onTextColor: (c: string) => void;
  onBgColor: (c: string) => void;
  onTextAlign: (a: string) => void;
  onFontSize: (s: string) => void;
  onSort?: (dir: "asc" | "desc") => void;
  onFilter?: () => void;
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
  onExportCsv?: () => void;
  onInsertText?: (text: string) => void;
  lightMode?: boolean;
  documentLightMode?: boolean;
  onToggleDocumentTheme?: () => void;
}

const DEFAULT_ORDER = ["file", "cell-format", "emoji", "data-tools", "view"];

const SheetsToolbar = ({
  onBoldToggle, onItalicToggle, onUnderlineToggle, onStrikethroughToggle,
  onTextColor, onBgColor, onTextAlign, onFontSize, onSort, onFilter,
  renaming, setRenaming, renameValue, setRenameValue, commitRename,
  documentTitle, confirmDelete, setConfirmDelete, onDelete,
  studioMode, onToggleStudio, onExportCsv, onInsertText,
  lightMode = false, documentLightMode, onToggleDocumentTheme,
}: SheetsToolbarProps) => {
  const lm = lightMode;
  const [fs, setFs] = useState("12");
  const { order, handleReorder } = useToolbarOrder("flux-sheets-toolbar-order", DEFAULT_ORDER);
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

  useEffect(() => {
    const savedPos = localStorage.getItem("flux-sheets-toolbar-pos");
    const savedFloating = localStorage.getItem("flux-sheets-toolbar-floating");
    if (savedPos) {
      try {
        const { px, py } = JSON.parse(savedPos);
        x.set(px);
        y.set(py);
      } catch {}
    }
    if (savedFloating === "true") setIsFloating(true);
  }, []);

  const handleToolbarDragEnd = useCallback((event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const newX = x.get() + info.offset.x;
    const newY = y.get() + info.offset.y;
    const bounds = { left: -window.innerWidth * 0.3, right: window.innerWidth * 0.3, top: -window.innerHeight * 0.3, bottom: window.innerHeight * 0.5 };
    const clampedX = Math.max(bounds.left, Math.min(bounds.right, newX));
    const clampedY = Math.max(bounds.top, Math.min(bounds.bottom, newY));
    x.set(clampedX);
    y.set(clampedY);
    localStorage.setItem("flux-sheets-toolbar-pos", JSON.stringify({ px: clampedX, py: clampedY }));
  }, [x, y]);

  const toggleFloating = useCallback(() => {
    const newFloating = !isFloating;
    setIsFloating(newFloating);
    localStorage.setItem("flux-sheets-toolbar-floating", String(newFloating));
    if (!newFloating) { x.set(0); y.set(0); localStorage.setItem("flux-sheets-toolbar-pos", JSON.stringify({ px: 0, py: 0 })); }
  }, [isFloating, x, y]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
        tolerance: 5,
      },
    })
  );

  const sep = <div className={`w-px h-5 mx-0.5 ${lm ? "bg-gray-200" : "bg-white/[0.1]"}`} />;
  const selectCls = `text-[11px] h-7 px-1.5 rounded-lg border outline-none transition-colors ${
    lm
      ? "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
      : "border-white/[0.1] bg-white/[0.06] text-foreground/80 hover:bg-white/[0.1]"
  }`;

  const segmentMap: Record<string, React.ReactNode> = {
    file: (
      <ToolbarSegment key="file" id="file" sortable>
        <FileMenu
          renaming={renaming} setRenaming={setRenaming} renameValue={renameValue} setRenameValue={setRenameValue}
          commitRename={commitRename} documentTitle={documentTitle} confirmDelete={confirmDelete} setConfirmDelete={setConfirmDelete}
          onDelete={onDelete} lightMode={lm}
        />
      </ToolbarSegment>
    ),
    "cell-format": (
      <ToolbarSegment key="cell-format" id="cell-format" sortable>
        <select
          value={fs}
          onChange={e => { setFs(e.target.value); onFontSize(e.target.value); }}
          className={`${selectCls} w-[50px]`}
        >
          {["8", "10", "12", "14", "16", "18", "20", "24", "28", "36"].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        {sep}
        <ToolbarButton icon={<Bold size={14} />} label="Bold" onClick={onBoldToggle} lightMode={lm} />
        <ToolbarButton icon={<Italic size={14} />} label="Italic" onClick={onItalicToggle} lightMode={lm} />
        <ToolbarButton icon={<Underline size={14} />} label="Underline" onClick={onUnderlineToggle} lightMode={lm} />
        <ToolbarButton icon={<Strikethrough size={14} />} label="Strikethrough" onClick={onStrikethroughToggle} lightMode={lm} />
        {sep}
        <ColorPickerPopover icon={<Palette size={14} />} label="Text color" onSelect={onTextColor} lightMode={lm} />
        <ColorPickerPopover icon={<PaintBucket size={14} />} label="Fill color" onSelect={onBgColor} lightMode={lm} />
        {sep}
        <ToolbarButton icon={<AlignLeft size={14} />} label="Align left" onClick={() => onTextAlign("left")} lightMode={lm} />
        <ToolbarButton icon={<AlignCenter size={14} />} label="Align center" onClick={() => onTextAlign("center")} lightMode={lm} />
        <ToolbarButton icon={<AlignRight size={14} />} label="Align right" onClick={() => onTextAlign("right")} lightMode={lm} />
      </ToolbarSegment>
    ),
    emoji: (
      <ToolbarSegment key="emoji" id="emoji" sortable>
        <EmojiTouchbar onInsert={(emoji) => onInsertText?.(emoji)} lightMode={lm} />
      </ToolbarSegment>
    ),
    "data-tools": (
      <ToolbarSegment key="data-tools" id="data-tools" sortable>
        <ToolbarButton icon={<ArrowDownAZ size={14} />} label="Sort A-Z" onClick={() => onSort?.("asc")} lightMode={lm} />
        <ToolbarButton icon={<ArrowUpAZ size={14} />} label="Sort Z-A" onClick={() => onSort?.("desc")} lightMode={lm} />
        <ToolbarButton icon={<Filter size={14} />} label="Filter" onClick={() => onFilter?.()} lightMode={lm} />
      </ToolbarSegment>
    ),
    view: (
      <ToolbarSegment key="view" id="view" sortable>
        <ViewModeToggle
          studioMode={studioMode} onToggleStudio={onToggleStudio}
          zoom={100} onZoomChange={() => {}} lightMode={lm}
          documentLightMode={documentLightMode}
          onToggleDocumentTheme={onToggleDocumentTheme}
        />
        {onExportCsv && (
          <ToolbarButton icon={<Download size={14} />} label="Export CSV" onClick={onExportCsv} lightMode={lm} />
        )}
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
      onDragEnd={handleToolbarDragEnd}
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

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={onSegmentDragStart} onDragEnd={onSegmentDragEnd}>
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

export default SheetsToolbar;
