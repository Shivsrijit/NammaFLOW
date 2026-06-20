import { useState } from "react";

function cellColor(v, max, isDark) {
  if (max <= 0) return "transparent";
  const t = v / max;
  const stops = isDark
    ? [[11, 11, 14], [92, 69, 44], [197, 160, 115], [255, 235, 200]] // Obsidian -> Deep Bronze -> Gold -> Warm Light Gold
    : [[244, 244, 245], [217, 119, 6], [180, 83, 9], [120, 53, 4]]; // Off-white -> Amber/Bronze -> Dark Gold -> Deep Bronze
  const seg = Math.min(2, Math.floor(t * 3));
  const lt = t * 3 - seg;
  const a = stops[seg], b = stops[seg + 1];
  const c = a.map((x, i) => Math.round(x + (b[i] - x) * lt));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

export default function TemporalView({ temporal, isDark, fullWidth }) {
  const [hover, setHover] = useState(null);
  if (!temporal) return null;
  const { matrix, dow_names } = temporal;
  const max = Math.max(...matrix.flat(), 1);
  const hours = Array.from({ length: 24 }, (_, h) => h);

  if (fullWidth) {
    return (
      <div className="bg-transparent">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h4 className="font-display font-bold text-[var(--text)] text-xs uppercase tracking-wider">Weekly Load Distribution</h4>
            <span className="text-[9px] text-[var(--text-soft)] mt-1 block font-medium">Violation persistence maps across the week</span>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-[var(--text-soft)]">
            <div className="flex items-center gap-2">
              {hover
                ? <span className="text-accent font-bold">{dow_names[hover.d]} {String(hover.h).padStart(2, "0")}:00 · {hover.v.toLocaleString()} cases</span>
                : <span className="text-[var(--text-soft)]/60 font-medium">Hover cell for exact load count</span>}
            </div>
            <div className="flex items-center gap-1">
              <span>Low</span>
              <span className="flex gap-[2px]">
                {[0.1, 0.4, 0.7, 1].map((t) => (
                  <span key={t} className="w-3.5 h-2 rounded-[2px]" style={{ background: cellColor(t * max, max, isDark) }} />
                ))}
              </span>
              <span>High</span>
            </div>
          </div>
        </div>

        {/* Flat grid */}
        <div className="overflow-x-auto scrollbar-none w-full pb-2">
          <div className="min-w-[650px] w-full">
            <div className="flex mb-1.5">
              <div className="w-10 shrink-0" />
              {hours.map((h) => (
                <div key={h} className="flex-1 text-center text-[10px] font-bold text-[var(--text-soft)]/60">{h % 3 === 0 ? `${h}:00` : ""}</div>
              ))}
            </div>
            {matrix.map((row, d) => (
              <div key={d} className="flex items-center mb-[3px]">
                <div className="w-10 shrink-0 text-[10px] font-bold text-[var(--text-soft)]">{dow_names[d]}</div>
                {row.map((v, h) => (
                  <div key={h} className="flex-1 aspect-square m-[1px] rounded-[3px] cursor-pointer transition-all hover:scale-125 duration-150"
                    onMouseEnter={() => setHover({ d, h, v })}
                    onMouseLeave={() => setHover(null)}
                    style={{ background: cellColor(v, max, isDark) }} />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Compact sidebar grid
  return (
    <div className="bg-transparent w-full">
      <div className="flex items-center justify-between mb-3 text-[10px] font-semibold">
        <div className="text-[var(--text-soft)]">
          {hover
            ? `${dow_names[hover.d]} ${String(hover.h).padStart(2, "0")}:00 · ${hover.v.toLocaleString()} cases`
            : "Hover cells for exact counts"}
        </div>
        <div className="flex items-center gap-1 text-[var(--text-soft)]/60">
          <span>Low</span>
          <span className="flex gap-[2px]">
            {[0.1, 0.4, 0.7, 1].map((t) => (
              <span key={t} className="w-2.5 h-2 rounded-[2px]" style={{ background: cellColor(t * max, max, isDark) }} />
            ))}
          </span>
          <span>High</span>
        </div>
      </div>

      <div className="overflow-x-auto scrollbar-none w-full">
        <div className="min-w-[280px] w-full">
          <div className="flex mb-1">
            <div className="w-8 shrink-0" />
            {hours.map((h) => (
              <div key={h} className="flex-1 text-center text-[8px] font-bold text-[var(--text-soft)]/60">{h % 4 === 0 ? `${h}h` : ""}</div>
            ))}
          </div>
          {matrix.map((row, d) => (
            <div key={d} className="flex items-center mb-[2px]">
              <div className="w-8 shrink-0 text-[9px] font-bold text-[var(--text-soft)]">{dow_names[d]}</div>
              {row.map((v, h) => (
                <div key={h} className="flex-1 aspect-square m-[0.7px] rounded-[1.5px] cursor-pointer transition-transform hover:scale-125"
                  onMouseEnter={() => setHover({ d, h, v })}
                  onMouseLeave={() => setHover(null)}
                  style={{ background: cellColor(v, max, isDark) }} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
