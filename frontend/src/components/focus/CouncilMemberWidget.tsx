import React, { useState, useEffect, useRef, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, MessageCircle, X } from "lucide-react";

const PERSONAS = [
  { key: "violet", name: "Violet", color: "#8b5cf6", role: "Strategist", phrases: ["Would you like my perspective?", "I see a pattern forming...", "Let's think strategically.", "Consider the long game here."] },
  { key: "leaf", name: "Leaf", color: "#22c55e", role: "Operator", phrases: ["Let's get this done.", "I have an action plan.", "Execution is everything.", "Shall we optimize this?"] },
  { key: "rose", name: "Rose", color: "#f43f5e", role: "Skeptic", phrases: ["Have you considered risks?", "Let me challenge that.", "What's the worst case?", "I see a blind spot."] },
  { key: "blue", name: "Blue", color: "#3b82f6", role: "Analyst", phrases: ["The data suggests...", "I have a strategic insight.", "Let's examine the evidence.", "Numbers don't lie."] },
  { key: "sunny", name: "Sunny", color: "#eab308", role: "Optimist", phrases: ["This is going to be great!", "I believe in this!", "Shall we refine this?", "The opportunity is huge!"] },
];

interface Props {
  personaKey?: string;
}

const CouncilMemberWidget = ({ personaKey = "violet" }: Props) => {
  const persona = PERSONAS.find(p => p.key === personaKey) || PERSONAS[0];
  const [speechBubble, setSpeechBubble] = useState("");
  const [showBubble, setShowBubble] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<{role: string; text: string}[]>([]);
  const intervalRef = useRef<any>(null);
  const pi = PERSONAS.indexOf(persona);

  // Rotate speech bubbles
  useEffect(() => {
    const show = () => {
      const phrase = persona.phrases[Math.floor(Math.random() * persona.phrases.length)];
      setSpeechBubble(phrase);
      setShowBubble(true);
      setTimeout(() => setShowBubble(false), 5000);
    };
    show();
    intervalRef.current = setInterval(show, 25000 + Math.random() * 15000);
    return () => clearInterval(intervalRef.current);
  }, [persona]);

  const handleSend = () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput.trim();
    setMessages(prev => [...prev, { role: "user", text: userMsg }]);
    setChatInput("");
    // Simulate AI reply
    setTimeout(() => {
      const reply = persona.phrases[Math.floor(Math.random() * persona.phrases.length)];
      setMessages(prev => [...prev, { role: "ai", text: `${reply} Regarding "${userMsg}" — I'd suggest taking a measured approach and evaluating all angles before committing.` }]);
    }, 1200);
  };

  // Baymax-style body SVG
  const size = 80;

  return (
    <div className="flex flex-col items-center h-full relative select-none" onPointerDown={e => e.stopPropagation()}>
      {/* Speech Bubble */}
      <AnimatePresence>
        {showBubble && !chatOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            className="absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full z-10 max-w-[180px]"
          >
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl px-3 py-2 text-[10px] text-white/80 shadow-lg relative">
              {speechBubble}
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-2 h-2 bg-white/10 border-r border-b border-white/20 rotate-45" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Baymax-style figure */}
      <motion.div
        className="cursor-pointer relative"
        onClick={() => { setShowBubble(true); setSpeechBubble(persona.phrases[Math.floor(Math.random() * persona.phrases.length)]); }}
        animate={{
          y: [0, -3, 0, -1, 0],
          rotate: pi % 2 === 0 ? [-0.5, 0.5, -0.5] : [0.5, -0.5, 0.5],
        }}
        transition={{ duration: 4 + pi * 0.5, repeat: Infinity, ease: "easeInOut" }}
      >
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="drop-shadow-lg">
          {/* Body — rounded pill shape (Baymax-inspired) */}
          <ellipse cx={size/2} cy={size * 0.55} rx={size * 0.32} ry={size * 0.38}
            fill={persona.color} opacity={0.85}
          />
          {/* Head — larger round top */}
          <circle cx={size/2} cy={size * 0.28} r={size * 0.22}
            fill={persona.color} opacity={0.95}
          />
          {/* Inner glow */}
          <circle cx={size/2} cy={size * 0.28} r={size * 0.16}
            fill="white" opacity={0.08}
          />
          {/* Eyes — connected line (Baymax signature) */}
          <line x1={size * 0.38} y1={size * 0.27} x2={size * 0.62} y2={size * 0.27}
            stroke="white" strokeWidth={1.2} opacity={0.4}
          />
          {/* Left eye */}
          <motion.circle
            cx={size * 0.42} cy={size * 0.27} r={size * 0.035}
            fill="white" opacity={0.9}
            animate={{ cx: [size * 0.42, size * 0.43, size * 0.41, size * 0.42] }}
            transition={{ duration: 5 + pi, repeat: Infinity, ease: "easeInOut" }}
          />
          {/* Right eye */}
          <motion.circle
            cx={size * 0.58} cy={size * 0.27} r={size * 0.035}
            fill="white" opacity={0.9}
            animate={{ cx: [size * 0.58, size * 0.59, size * 0.57, size * 0.58] }}
            transition={{ duration: 5 + pi, repeat: Infinity, ease: "easeInOut" }}
          />
          {/* Arms — small ovals */}
          <ellipse cx={size * 0.15} cy={size * 0.52} rx={size * 0.08} ry={size * 0.12}
            fill={persona.color} opacity={0.7} transform={`rotate(-15 ${size * 0.15} ${size * 0.52})`}
          />
          <ellipse cx={size * 0.85} cy={size * 0.52} rx={size * 0.08} ry={size * 0.12}
            fill={persona.color} opacity={0.7} transform={`rotate(15 ${size * 0.85} ${size * 0.52})`}
          />
          {/* Subtle chest port (Baymax detail) */}
          <rect x={size * 0.44} y={size * 0.45} width={size * 0.12} height={size * 0.06}
            rx={size * 0.02} fill="white" opacity={0.1}
          />
        </svg>
      </motion.div>

      {/* Name + role */}
      <div className="text-center mt-1">
        <p className="text-[10px] font-semibold" style={{ color: persona.color }}>{persona.name}</p>
        <p className="text-[8px] text-white/30">{persona.role}</p>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-1.5 mt-1">
        <button
          onClick={() => setChatOpen(!chatOpen)}
          className="w-5 h-5 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-all"
          title="Chat"
        >
          <MessageCircle size={10} className="text-white/60" />
        </button>
      </div>

      {/* Chat panel */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-64 z-50 bg-black/80 backdrop-blur-xl border border-white/15 rounded-xl shadow-2xl overflow-hidden"
            onPointerDown={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
              <span className="text-[11px] font-medium" style={{ color: persona.color }}>Chat with {persona.name}</span>
              <button onClick={() => setChatOpen(false)} className="text-white/30 hover:text-white/60"><X size={12} /></button>
            </div>
            <div className="h-32 overflow-auto p-2 space-y-1.5 council-hidden-scrollbar">
              {messages.length === 0 && (
                <p className="text-[10px] text-white/20 text-center py-4">Ask {persona.name} anything...</p>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`text-[10px] px-2 py-1 rounded-lg max-w-[90%] ${m.role === "user" ? "ml-auto bg-white/10 text-white/70" : "bg-white/5 text-white/60"}`}>
                  {m.text}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-1.5 p-2 border-t border-white/10">
              <input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSend()}
                placeholder="Type a message..."
                className="flex-1 bg-white/5 border border-white/10 rounded-lg text-[10px] px-2 py-1 text-white/70 placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-white/20"
              />
              <button onClick={handleSend} className="text-white/40 hover:text-white/70 transition-colors">
                <MessageCircle size={12} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default memo(CouncilMemberWidget);
