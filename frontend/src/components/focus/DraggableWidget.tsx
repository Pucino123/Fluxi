import React, { useRef, useCallback, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, GripHorizontal, Minus, Plus, Settings2, Type, Palette, Paintbrush } from "lucide-react";
import { useFocusStore } from "@/context/FocusContext";
import { motion, AnimatePresence } from "framer-motion";
import { Slider } from "@/components/ui/slider";

const WIDGET_COLORS = [
  { name: "White", value: "#ffffff" },
  { name: "Black", value: "#000000" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Violet", value: "#8b5cf6" },
  { name: "Pink", value: "#ec4899" },
  { name: "Green", value: "#22c55e" },
  { name: "Orange", value: "#f97316" },
  { name: "Red", value: "#ef4444" },
];

interface FontSizeControl {
  value: number;
  set: (v: number) => void;
  min: number;
  max: number;
  step: number;
}

interface DraggableWidgetProps {
  id: string;
  title: string;
  children: React.ReactNode;
  defaultPosition?: { x: number; y: number };
  defaultSize?: { w: number; h: number };
  className?: string;
  hideHeader?: boolean;
  scrollable?: boolean;
  fontSizeControl?: FontSizeControl;
  autoHeight?: boolean;
  onEditAction?: () => void;
  containerStyle?: React.CSSProperties;
}

const GRID = 40;

const DraggableWidget = ({
  id, title, children, defaultPosition, defaultSize, className = "", hideHeader = false, scrollable = false, fontSizeControl, autoHeight = false, onEditAction, containerStyle,
}: DraggableWidgetProps) => {
  const { widgetPositions, updateWidgetPosition, toggleWidget, getWidgetOpacity, setWidgetOpacity, widgetMinimalMode, systemMode, widgetStyles, updateWidgetStyle } = useFocusStore();
  const isBuildMode = systemMode === "build";
  const isFocusMode = systemMode === "focus";
  const widgetStyle = widgetStyles[id] ?? {};
  const defW = defaultSize?.w ?? 380;
  const defH = defaultSize?.h ?? 300;
  const rawPos = widgetPositions[id] || {
    x: defaultPosition?.x ?? 100,
    y: defaultPosition?.y ?? 100,
    w: defW,
    h: defH,
  };

  const safeW = (!rawPos.w || isNaN(rawPos.w) || rawPos.w < 200) ? defW : rawPos.w;
  const safeH = (!rawPos.h || isNaN(rawPos.h) || rawPos.h < 150) ? defH : rawPos.h;

  const maxX = typeof window !== "undefined" ? Math.max(0, window.innerWidth - safeW) : 1400;
  const maxY = typeof window !== "undefined" ? Math.max(0, window.innerHeight - safeH) : 800;
  const rawX = isNaN(rawPos.x) || !isFinite(rawPos.x) ? (defaultPosition?.x ?? 100) : rawPos.x;
  const rawY = isNaN(rawPos.y) || !isFinite(rawPos.y) ? (defaultPosition?.y ?? 100) : rawPos.y;
  const pos = {
    x: Math.max(0, Math.min(rawX, maxX)),
    y: Math.max(0, Math.min(rawY, maxY)),
    w: safeW,
    h: safeH,
  };

  const dragging = useRef(false);
  const resizing = useRef(false);
  const offset = useRef({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [showFontSize, setShowFontSize] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [stylePopup, setStylePopup] = useState<{ x: number; y: number } | null>(null);

  const opacity = getWidgetOpacity(id);
  const textDark = opacity > 0.55;
  const textClass = textDark ? "focus-widget-light" : "";

  const posRef = useRef(pos);
  posRef.current = pos;

  const onPointerDownDrag = useCallback((e: React.PointerEvent) => {
    dragging.current = true;
    setIsDragging(true);
    offset.current = { x: e.clientX - posRef.current.x, y: e.clientY - posRef.current.y };
  }, []);

  const onPointerDownResize = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    resizing.current = true;
    setIsDragging(true);
    offset.current = { x: e.clientX, y: e.clientY };
  }, []);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (dragging.current || resizing.current) {
        e.preventDefault();
      }
      if (dragging.current) {
        const nx = e.clientX - offset.current.x;
        const ny = e.clientY - offset.current.y;
        updateWidgetPosition(id, { x: nx, y: ny });
      }
      if (resizing.current) {
        const dx = e.clientX - offset.current.x;
        const dy = e.clientY - offset.current.y;
        offset.current = { x: e.clientX, y: e.clientY };
        updateWidgetPosition(id, {
          w: Math.max(280, posRef.current.w + dx),
          h: Math.max(200, posRef.current.h + dy),
        });
      }
    };

    const onUp = () => {
      if (dragging.current || resizing.current) {
        if (isBuildMode && dragging.current) {
          updateWidgetPosition(id, {
            x: Math.round(posRef.current.x / GRID) * GRID,
            y: Math.round(posRef.current.y / GRID) * GRID,
          });
        }
        dragging.current = false;
        resizing.current = false;
        setIsDragging(false);
      }
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [id, isBuildMode, updateWidgetPosition]);

  const isGlass = opacity < 0.01;
  const bgAlpha = isGlass ? 0 : 0.1 + opacity * 0.8;
  const borderAlpha = isGlass ? 0 : 0.2 + opacity * 0.4;
  const blurClass = isGlass ? "" : "backdrop-blur-[16px]";

  const iconColor = textDark ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.5)";
  const activeIconBg = textDark ? "bg-black/10" : "bg-white/15";

  const showHeader = !isFocusMode && !hideHeader && !widgetMinimalMode;
  const showResize = !isFocusMode && !widgetMinimalMode;
  const showCorners = isBuildMode && !widgetMinimalMode;

  // Widget custom styles with proper defaults
  const customBgColor = widgetStyle.bgColor;
  const customTextColor = widgetStyle.textColor;
  const customOpacity = widgetStyle.opacity !== undefined ? widgetStyle.opacity : 1;
  const customBorderRadius = widgetStyle.borderRadius !== undefined ? widgetStyle.borderRadius : 16;
  const customBorderColor = widgetStyle.borderColor;
  const customBorderWidth = widgetStyle.borderWidth !== undefined ? widgetStyle.borderWidth : 1;
  const customBorderOpacity = widgetStyle.borderOpacity !== undefined ? widgetStyle.borderOpacity : 1;

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setStylePopup({ x: e.clientX, y: e.clientY });
  }, []);

  const openStylePopup = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setStylePopup({ x: rect.left, y: rect.bottom + 8 });
  }, []);

  // Render the style customization popup
  const renderStylePopup = () => {
    if (!stylePopup) return null;
    
    return createPortal(
      <React.Fragment>
        <div className="fixed inset-0 z-[9998]" onClick={() => setStylePopup(null)} />
        <div
          className="fixed z-[9999] bg-popover/95 backdrop-blur-xl border border-border rounded-xl shadow-2xl overflow-hidden transition-shadow hover:shadow-[0_8px_40px_rgba(0,0,0,0.4)]"
          style={{ left: Math.min(stylePopup.x, window.innerWidth - 320), top: Math.min(stylePopup.y, window.innerHeight - 450), width: 300 }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div
            className="flex items-center justify-center py-1 cursor-move border-b border-border/20 bg-secondary/30 hover:bg-secondary/50 transition-colors group/drag"
            onPointerDown={(e) => {
              e.stopPropagation();
              const popup = e.currentTarget.parentElement;
              if (!popup) return;
              const rect = popup.getBoundingClientRect();
              const offsetX = e.clientX - rect.left;
              const offsetY = e.clientY - rect.top;
              const onMove = (ev: PointerEvent) => {
                popup.style.left = `${ev.clientX - offsetX}px`;
                popup.style.top = `${ev.clientY - offsetY}px`;
              };
              const onUp = () => {
                window.removeEventListener("pointermove", onMove);
                window.removeEventListener("pointerup", onUp);
              };
              window.addEventListener("pointermove", onMove);
              window.addEventListener("pointerup", onUp);
            }}
          >
            <div className="w-8 h-1 rounded-full bg-muted-foreground/30 group-hover/drag:bg-muted-foreground/50 transition-colors" />
          </div>

          <div className="px-4 py-3 border-b border-border/30">
            <p className="text-xs font-semibold text-foreground mb-1">{title}</p>
            <p className="text-[10px] text-muted-foreground">Widget Customization</p>
          </div>

          {/* Text Color */}
          <div className="px-4 py-3 border-b border-border/30">
            <p className="text-[10px] text-muted-foreground uppercase mb-2 flex items-center gap-1"><Type size={10} /> Text Color</p>
            <div className="flex flex-wrap gap-1.5 items-center">
              <button onClick={() => updateWidgetStyle(id, { textColor: undefined })}
                className={`rounded-full border-2 transition-all hover:scale-125 ${!customTextColor ? "border-foreground/40 scale-110" : "border-transparent"}`}
                style={{ background: "linear-gradient(135deg, #fff 50%, #000 50%)", width: 18, height: 18 }} title="Default" />
              {WIDGET_COLORS.map((c) => (
                <button key={c.name} onClick={() => updateWidgetStyle(id, { textColor: c.value })}
                  className={`rounded-full border-2 transition-all hover:scale-125 ${customTextColor === c.value ? "border-foreground/40 scale-110" : "border-transparent"}`}
                  style={{ backgroundColor: c.value, width: 18, height: 18 }} title={c.name} />
              ))}
              <label className="rounded-full border-2 border-dashed border-muted-foreground/40 cursor-pointer hover:scale-125 transition-all relative overflow-hidden"
                style={{ width: 18, height: 18 }} title="Custom">
                <input type="color" value={customTextColor || "#ffffff"}
                  onChange={(e) => updateWidgetStyle(id, { textColor: e.target.value })}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
              </label>
            </div>
          </div>

          {/* Background Color */}
          <div className="px-4 py-3 border-b border-border/30">
            <p className="text-[10px] text-muted-foreground uppercase mb-2 flex items-center gap-1"><Palette size={10} /> Background</p>
            <div className="flex flex-wrap gap-1.5 items-center">
              <button onClick={() => updateWidgetStyle(id, { bgColor: undefined })}
                className={`rounded-full border-2 transition-all hover:scale-125 ${!customBgColor ? "border-foreground/40 scale-110" : "border-transparent"}`}
                style={{ background: "rgba(255,255,255,0.1)", width: 18, height: 18 }} title="Default" />
              {WIDGET_COLORS.map((c) => (
                <button key={c.name} onClick={() => updateWidgetStyle(id, { bgColor: c.value })}
                  className={`rounded-full border-2 transition-all hover:scale-125 ${customBgColor === c.value ? "border-foreground/40 scale-110" : "border-transparent"}`}
                  style={{ backgroundColor: c.value, width: 18, height: 18 }} title={c.name} />
              ))}
              <label className="rounded-full border-2 border-dashed border-muted-foreground/40 cursor-pointer hover:scale-125 transition-all relative overflow-hidden"
                style={{ width: 18, height: 18 }} title="Custom bg">
                <input type="color" value={customBgColor || "#16161a"}
                  onChange={(e) => updateWidgetStyle(id, { bgColor: e.target.value })}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
              </label>
            </div>
          </div>

          {/* Opacity */}
          <div className="px-4 py-3 border-b border-border/30 flex items-center gap-3">
            <p className="text-[10px] text-muted-foreground uppercase shrink-0">Opacity</p>
            <input type="range" min="0" max="1" step="0.05" value={customOpacity}
              onChange={(e) => updateWidgetStyle(id, { opacity: parseFloat(e.target.value) })}
              onPointerDown={(e) => e.stopPropagation()}
              className="flex-1 h-1 rounded-full appearance-none bg-secondary cursor-pointer accent-primary" />
            <span className="text-[10px] text-muted-foreground tabular-nums w-8 text-right">{Math.round(customOpacity * 100)}%</span>
          </div>

          {/* Border Radius */}
          <div className="px-4 py-3 border-b border-border/30 flex items-center gap-3">
            <p className="text-[10px] text-muted-foreground uppercase shrink-0">Radius</p>
            <input type="range" min="0" max="32" step="1" value={customBorderRadius}
              onChange={(e) => updateWidgetStyle(id, { borderRadius: parseInt(e.target.value) })}
              onPointerDown={(e) => e.stopPropagation()}
              className="flex-1 h-1 rounded-full appearance-none bg-secondary cursor-pointer accent-primary" />
            <span className="text-[10px] text-muted-foreground tabular-nums w-8 text-right">{customBorderRadius}px</span>
          </div>

          {/* Border Color */}
          <div className="px-4 py-3 border-b border-border/30">
            <p className="text-[10px] text-muted-foreground uppercase mb-2">Border Color</p>
            <div className="flex flex-wrap gap-1.5 items-center">
              <button onClick={() => updateWidgetStyle(id, { borderColor: undefined })}
                className={`rounded-full border-2 transition-all hover:scale-125 ${!customBorderColor ? "border-foreground/40 scale-110" : "border-transparent"}`}
                style={{ background: "rgba(255,255,255,0.2)", width: 16, height: 16 }} title="Default" />
              {WIDGET_COLORS.slice(0, 6).map((c) => (
                <button key={c.name} onClick={() => updateWidgetStyle(id, { borderColor: c.value })}
                  className={`rounded-full border-2 transition-all hover:scale-125 ${customBorderColor === c.value ? "border-foreground/40 scale-110" : "border-transparent"}`}
                  style={{ backgroundColor: c.value, width: 16, height: 16 }} title={c.name} />
              ))}
              <label className="rounded-full border-2 border-dashed border-muted-foreground/40 cursor-pointer hover:scale-125 transition-all relative overflow-hidden"
                style={{ width: 16, height: 16 }} title="Custom border">
                <input type="color" value={customBorderColor || "#ffffff"}
                  onChange={(e) => updateWidgetStyle(id, { borderColor: e.target.value })}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
              </label>
            </div>
          </div>

          {/* Border Width */}
          <div className="px-4 py-3 border-b border-border/30 flex items-center gap-3">
            <p className="text-[10px] text-muted-foreground uppercase shrink-0">Border</p>
            <input type="range" min="0" max="4" step="1" value={customBorderWidth}
              onChange={(e) => updateWidgetStyle(id, { borderWidth: parseInt(e.target.value) })}
              onPointerDown={(e) => e.stopPropagation()}
              className="flex-1 h-1 rounded-full appearance-none bg-secondary cursor-pointer accent-primary" />
            <span className="text-[10px] text-muted-foreground tabular-nums w-8 text-right">{customBorderWidth}px</span>
          </div>

          {/* Border Opacity */}
          <div className="px-4 py-3 flex items-center gap-3">
            <p className="text-[10px] text-muted-foreground uppercase shrink-0">B.Opacity</p>
            <input type="range" min="0" max="1" step="0.05" value={customBorderOpacity}
              onChange={(e) => updateWidgetStyle(id, { borderOpacity: parseFloat(e.target.value) })}
              onPointerDown={(e) => e.stopPropagation()}
              className="flex-1 h-1 rounded-full appearance-none bg-secondary cursor-pointer accent-primary" />
            <span className="text-[10px] text-muted-foreground tabular-nums w-8 text-right">{Math.round(customBorderOpacity * 100)}%</span>
          </div>
        </div>
      </React.Fragment>,
      document.body
    );
  };

  return (
    <>
      <motion.div
        data-widget={id}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.25 }}
        className={`absolute z-50 ${isDragging ? "cursor-grabbing select-none" : ""} ${textClass} ${className} ${
          isBuildMode ? "rounded-2xl" : ""
        }`}
        style={{
          left: pos.x,
          top: pos.y,
          width: pos.w,
          ...(autoHeight ? {} : { height: pos.h }),
          pointerEvents: "none",
          opacity: customOpacity,
          ...containerStyle,
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onContextMenu={handleContextMenu}
      >
        {isBuildMode && (
          <motion.div
            className="absolute inset-0 rounded-2xl pointer-events-none"
            style={{ border: "1px solid rgba(255,255,255,0.2)" }}
            animate={{ opacity: [0.15, 0.35, 0.15] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          />
        )}

        {isBuildMode && (
          <div
            className="absolute -top-0.5 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-1 px-3 py-1 rounded-b-lg bg-white/10 backdrop-blur-sm cursor-grab active:cursor-grabbing select-none border border-t-0 border-white/15"
            style={{ pointerEvents: "auto" }}
            onPointerDown={onPointerDownDrag}
          >
            <GripHorizontal size={14} className="text-white/50" />
            <span className="text-[9px] font-semibold text-white/40 uppercase tracking-wider">{title}</span>
          </div>
        )}

        <div
          className={`w-full h-full flex flex-col ${widgetMinimalMode ? "" : `${blurClass} ${isGlass ? "" : (isFocusMode ? "shadow-lg" : "shadow-2xl")}`} overflow-hidden`}
          style={{
            background: widgetMinimalMode ? "transparent" : (() => {
              if (customBgColor) {
                // Convert HEX to RGBA with opacity
                if (customBgColor.startsWith('#')) {
                  const hex = customBgColor.replace('#', '');
                  const r = parseInt(hex.substring(0, 2), 16);
                  const g = parseInt(hex.substring(2, 4), 16);
                  const b = parseInt(hex.substring(4, 6), 16);
                  return `rgba(${r},${g},${b},${customOpacity})`;
                }
                return customBgColor;
              }
              return isGlass ? "transparent" : `rgba(255,255,255,${bgAlpha})`;
            })(),
            borderWidth: widgetMinimalMode ? 0 : (customBorderWidth !== undefined ? `${customBorderWidth}px` : (isGlass ? 0 : 1)),
            borderStyle: "solid",
            borderColor: widgetMinimalMode ? "transparent" : (customBorderColor || (isGlass ? "transparent" : `rgba(255,255,255,${borderAlpha})`)),
            borderRadius: `${customBorderRadius}px`,
            color: customTextColor || undefined,
            pointerEvents: "auto",
          }}
        >
          <AnimatePresence>
            {showHeader && (
              <motion.div
                key="header"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div
                  className="flex items-center justify-between px-4 py-2.5 cursor-grab active:cursor-grabbing select-none"
                  style={{ borderBottom: `1px solid rgba(${textDark ? "0,0,0" : "255,255,255"},0.1)` }}
                  onPointerDown={onPointerDownDrag}
                >
                  <div className="flex items-center gap-2">
                    <GripHorizontal size={14} style={{ color: textDark ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.4)" }} />
                    <span className="text-sm font-medium" style={{ color: customTextColor || (textDark ? "rgba(0,0,0,0.7)" : "rgba(255,255,255,0.8)") }}>{title}</span>
                  </div>
                  <motion.div
                    className="flex items-center gap-1"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: isHovered || isBuildMode ? 1 : 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    {onEditAction && isBuildMode && (
                      <button
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={onEditAction}
                        className="p-1 rounded-lg transition-colors bg-white/10 hover:bg-white/20"
                        style={{ color: iconColor }}
                        title="Edit"
                      >
                        <Settings2 size={14} />
                      </button>
                    )}
                    {fontSizeControl && (
                      <button
                        onClick={() => setShowFontSize(!showFontSize)}
                        className={`p-1 rounded-lg transition-colors ${showFontSize ? activeIconBg : ""}`}
                        style={{ color: iconColor }}
                        title="Adjust text size"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <text x="2" y="17" fontSize="14" fontWeight="bold" fill="currentColor" stroke="none">A</text>
                          <text x="14" y="17" fontSize="10" fill="currentColor" stroke="none">A</text>
                        </svg>
                      </button>
                    )}
                    {/* Style button - replaces opacity icon */}
                    <button
                      onClick={openStylePopup}
                      onPointerDown={(e) => e.stopPropagation()}
                      className={`p-1 rounded-lg transition-colors ${stylePopup ? activeIconBg : ""} hover:bg-white/15`}
                      style={{ color: iconColor }}
                      title="Style"
                    >
                      <Paintbrush size={14} />
                    </button>
                    <button
                      onClick={() => toggleWidget(id)}
                      className="p-1 rounded-lg transition-colors"
                      style={{ color: iconColor }}
                    >
                      <X size={14} />
                    </button>
                  </motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {showFontSize && fontSizeControl && !widgetMinimalMode && !isFocusMode && (
            <div className="px-4 py-2 flex items-center gap-3" style={{ borderBottom: `1px solid rgba(${textDark ? "0,0,0" : "255,255,255"},0.08)` }}>
              <span className="text-[10px] font-medium shrink-0" style={{ color: customTextColor || (textDark ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.4)") }}>Size</span>
              <button
                onClick={() => fontSizeControl.set(Math.max(fontSizeControl.min, fontSizeControl.value - fontSizeControl.step))}
                className="p-1 rounded-md bg-white/5 text-white/40 hover:text-white/70 hover:bg-white/10 transition-all"
              >
                <Minus size={12} />
              </button>
              <span className="text-[10px] tabular-nums w-8 text-center" style={{ color: customTextColor || (textDark ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.3)") }}>
                {fontSizeControl.value}px
              </span>
              <button
                onClick={() => fontSizeControl.set(Math.min(fontSizeControl.max, fontSizeControl.value + fontSizeControl.step))}
                className="p-1 rounded-md bg-white/5 text-white/40 hover:text-white/70 hover:bg-white/10 transition-all"
              >
                <Plus size={12} />
              </button>
            </div>
          )}

          <div className={`flex-1 ${scrollable ? "overflow-auto council-hidden-scrollbar" : "overflow-hidden"} px-3 ${isFocusMode ? "py-3" : "py-2"} ${widgetMinimalMode || isFocusMode ? "cursor-grab active:cursor-grabbing" : ""} ${customTextColor ? "[&_*]:!text-inherit" : ""}`}
            onPointerDown={(widgetMinimalMode || isFocusMode) ? onPointerDownDrag : undefined}
            style={{ color: customTextColor || undefined }}
          >
            {children}
          </div>

          <AnimatePresence>
            {showResize && (
              <motion.div
                key="resize"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className={`absolute bottom-0 right-0 cursor-nwse-resize ${isBuildMode ? "w-10 h-10" : "w-7 h-7"}`}
                style={{ pointerEvents: "auto" }}
                onPointerDown={onPointerDownResize}
              >
                {isBuildMode ? (
                  <div className="w-full h-full flex items-end justify-end p-0.5">
                    <div className="w-3 h-3 rounded-sm border-r-2 border-b-2 border-white/40" />
                  </div>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 16 16" style={{ color: textDark ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.3)" }}>
                    <path d="M14 16L16 14M9 16L16 9M4 16L16 4" stroke="currentColor" strokeWidth="1.5" fill="none" />
                  </svg>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {showCorners && (
              <motion.div
                key="corners"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="absolute top-0 left-0 w-2 h-2 rounded-full bg-white/20 border border-white/30 -translate-x-1/2 -translate-y-1/2" style={{ pointerEvents: "none" }} />
                <div className="absolute top-0 right-0 w-2 h-2 rounded-full bg-white/20 border border-white/30 translate-x-1/2 -translate-y-1/2" style={{ pointerEvents: "none" }} />
                <div className="absolute bottom-0 left-0 w-2 h-2 rounded-full bg-white/20 border border-white/30 -translate-x-1/2 translate-y-1/2" style={{ pointerEvents: "none" }} />
                <div className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-white/30 border border-white/40 translate-x-1/2 translate-y-1/2" style={{ pointerEvents: "none" }} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {renderStylePopup()}
    </>
  );
};

export default DraggableWidget;
