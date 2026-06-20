import { motion } from "framer-motion";

const FLIPS = [
  ["Patrol dispatches are reactive", "Predictive Route Allocation"],
  ["Flat violation counts", "Congestion Impact Index (CII)"],
  ["Arbitrary list ranking", "Smart Dispatch Queue"],
];

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
};

export default function Hero({ onEnterConsole }) {
  return (
    <section className="relative min-h-screen flex items-center justify-center px-6 py-24 overflow-hidden" style={{ background: "transparent" }}>
      
      {/* Decorative gradients for command console look, dynamic by theme */}
      <div 
        className="absolute inset-0 pointer-events-none z-[1]" 
        style={{
          background: `linear-gradient(to top, var(--bg) 0%, transparent 100%)`
        }}
      />
      <div 
        className="absolute inset-0 pointer-events-none z-[1]" 
        style={{
          background: `radial-gradient(ellipse at center, transparent 30%, rgba(var(--bg-rgb), 0.8) 100%)`
        }}
      />

      <div className="max-w-4xl mx-auto w-full relative z-10 text-center flex flex-col items-center justify-center">
        <motion.div variants={stagger} initial="hidden" animate="show" className="w-full flex flex-col items-center">
          
          <motion.div variants={item} className="flex items-center gap-2 px-3 py-1 rounded-md border border-[var(--border)] bg-[var(--surface)]/70 backdrop-blur-md mb-8 w-fit">
            <span className="w-1.5 h-1.5 rounded-full bg-accent" />
            <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-soft)]">Bengaluru Command Interface</span>
          </motion.div>

          <motion.h1 variants={item} className="font-display font-bold tracking-tight text-5xl sm:text-6xl lg:text-7.5xl text-[var(--text)] leading-[1.01] max-w-3xl">
            Predictive City Traffic &amp;<br />
            <span className="font-serif italic font-normal text-accent block mt-1">Parking Dispatch.</span>
          </motion.h1>

          <motion.p variants={item} className="text-[var(--text-soft)] mt-6 text-base sm:text-lg max-w-2xl leading-relaxed">
            Optimizing traffic officer patrol routes to resolve bottlenecks before they form. Correlated dynamically with street layouts, transit lanes, and congestion load.
          </motion.p>

          <motion.div variants={item} className="mt-8 flex flex-wrap gap-4 font-sans justify-center">
            <button
              onClick={() => onEnterConsole && onEnterConsole("leaderboard")}
              className="px-8 py-3.5 rounded-lg font-bold text-[10px] uppercase tracking-widest text-[var(--bg)] bg-[var(--text)] hover:opacity-90 active:scale-95 transition-all shadow-[0_2px_10px_rgba(0,0,0,0.05)]"
            >
              Enter Control Console
            </button>
            <button
              onClick={() => onEnterConsole && onEnterConsole("methodology")}
              className="px-8 py-3.5 rounded-lg border border-[var(--border)] bg-[var(--surface)]/60 backdrop-blur-sm text-[var(--text-soft)] hover:bg-[var(--surface-2)] active:scale-95 transition-all"
            >
              System Methodology
            </button>
          </motion.div>

          <motion.div variants={item} className="mt-16 space-y-4 w-full flex flex-col items-center">
            <div className="text-[9px] uppercase font-bold tracking-widest text-[var(--text-soft)]/60">Enforcement Paradigm Shift</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 border-t border-[var(--border)] pt-5 max-w-2xl w-full">
              {FLIPS.map(([from, to]) => (
                <div key={to} className="flex flex-col items-center text-center">
                  <span className="text-[9px] text-[var(--text-soft)]/60 line-through decoration-rose-500/50 truncate max-w-xs">{from}</span>
                  <span className="text-[11px] text-[var(--text)] font-semibold mt-1.5 flex items-center justify-center gap-1.5 w-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                    {to}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>

        </motion.div>
      </div>
    </section>
  );
}