import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Check, Flame, Trash2, Star, Clock, Repeat } from "lucide-react";
import { toast } from "sonner";

interface RoutineItem {
  id: string;
  title: string;
  time: string;
  repeat: "daily" | "weekly" | "custom";
  streak: number;
  completedToday: boolean;
  completedDays: number[];
}

const DAYS = ["M", "T", "W", "T", "F", "S", "S"];

const RoutineBuilderWidget = () => {
  const [routines, setRoutines] = useState<RoutineItem[]>(() => {
    try {
      const saved = localStorage.getItem("flux_routines");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newTime, setNewTime] = useState("07:00");
  const [newRepeat, setNewRepeat] = useState<"daily" | "weekly" | "custom">("daily");

  const save = useCallback((items: RoutineItem[]) => {
    setRoutines(items);
    localStorage.setItem("flux_routines", JSON.stringify(items));
  }, []);

  const addRoutine = () => {
    if (!newTitle.trim()) return;
    const item: RoutineItem = {
      id: crypto.randomUUID(),
      title: newTitle.trim(),
      time: newTime,
      repeat: newRepeat,
      streak: 0,
      completedToday: false,
      completedDays: [],
    };
    save([...routines, item]);
    setNewTitle(""); setNewTime("07:00"); setAdding(false);
    toast.success("Routine added");
  };

  const toggleComplete = (id: string) => {
    save(routines.map(r => {
      if (r.id !== id) return r;
      const wasComplete = r.completedToday;
      const day = new Date().getDay();
      return {
        ...r,
        completedToday: !wasComplete,
        streak: !wasComplete ? r.streak + 1 : Math.max(0, r.streak - 1),
        completedDays: !wasComplete
          ? [...new Set([...r.completedDays, day])]
          : r.completedDays.filter(d => d !== day),
      };
    }));
  };

  const deleteRoutine = (id: string) => {
    save(routines.filter(r => r.id !== id));
    toast.success("Routine removed");
  };

  const totalScore = routines.length > 0
    ? Math.round((routines.filter(r => r.completedToday).length / routines.length) * 100)
    : 0;

  const maxStreak = routines.reduce((max, r) => Math.max(max, r.streak), 0);

  return (
    <div className="flex flex-col h-full text-white/90 select-none" onPointerDown={e => e.stopPropagation()}>
      <div className="flex items-center justify-between px-1 pb-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Repeat size={14} className="text-violet-400" />
          <span className="text-xs font-semibold tracking-wide">Routine Builder</span>
        </div>
        <button onClick={() => setAdding(!adding)} className="w-6 h-6 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors">
          <Plus size={12} />
        </button>
      </div>

      <div className="flex items-center gap-3 px-1 py-2">
        <div className="flex items-center gap-1 text-[10px] text-white/50">
          <Star size={10} className="text-amber-400" />
          <span>{totalScore}% today</span>
        </div>
        <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: "linear-gradient(90deg, #8b5cf6, #6366f1, #3b82f6)" }}
            initial={{ width: 0 }}
            animate={{ width: `${totalScore}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>
        {maxStreak > 0 && (
          <div className="flex items-center gap-1 text-[10px] text-orange-400">
            <Flame size={10} /> {maxStreak}
          </div>
        )}
      </div>

      <AnimatePresence>
        {adding && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="space-y-2 px-1 py-2 border-b border-white/10">
              <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addRoutine()} placeholder="Routine name..." className="w-full bg-white/5 border border-white/15 rounded-lg text-xs px-3 py-1.5 placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-violet-500/50" autoFocus />
              <div className="flex items-center gap-2">
                <Clock size={10} className="text-white/40" />
                <input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} className="bg-white/5 border border-white/15 rounded text-[10px] px-2 py-1 text-white/70 focus:outline-none" />
                <select value={newRepeat} onChange={(e) => setNewRepeat(e.target.value as any)} className="bg-white/5 border border-white/15 rounded text-[10px] px-2 py-1 text-white/70 focus:outline-none">
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="custom">Custom</option>
                </select>
                <button onClick={addRoutine} className="ml-auto px-3 py-1 text-[10px] bg-violet-600 hover:bg-violet-500 rounded-lg transition-colors font-medium">Add</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 overflow-auto council-hidden-scrollbar space-y-1 py-2 px-1">
        {routines.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-white/25 text-[11px]">
            <Repeat size={20} className="mb-2 opacity-40" />
            <p>No routines yet</p>
            <p className="text-[10px]">Click + to build your first routine</p>
          </div>
        ) : (
          routines.map((routine) => (
            <motion.div key={routine.id} layout className={`group flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all ${routine.completedToday ? "bg-violet-500/10 border border-violet-500/20" : "bg-white/[0.03] hover:bg-white/[0.06] border border-transparent"}`}>
              <button onClick={() => toggleComplete(routine.id)} className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all ${routine.completedToday ? "bg-violet-500 text-white shadow-[0_0_8px_rgba(139,92,246,0.4)]" : "border border-white/20 hover:border-white/40"}`}>
                {routine.completedToday && <Check size={10} strokeWidth={3} />}
              </button>
              <div className="flex-1 min-w-0">
                <p className={`text-[11px] font-medium truncate ${routine.completedToday ? "line-through text-white/40" : ""}`}>{routine.title}</p>
                <div className="flex items-center gap-2 text-[9px] text-white/30">
                  <span>{routine.time}</span>
                  <span className="capitalize">{routine.repeat}</span>
                  {routine.streak > 0 && <span className="flex items-center gap-0.5 text-orange-400"><Flame size={8} /> {routine.streak}</span>}
                </div>
              </div>
              <div className="hidden group-hover:flex items-center gap-0.5">
                {DAYS.map((d, i) => (<div key={i} className={`w-2 h-2 rounded-full ${routine.completedDays.includes(i + 1) ? "bg-violet-500" : "bg-white/10"}`} title={d} />))}
              </div>
              <button onClick={() => deleteRoutine(routine.id)} className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-red-400 transition-all"><Trash2 size={12} /></button>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

export default RoutineBuilderWidget;
