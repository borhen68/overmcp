"use client";

import { motion } from "framer-motion";

export default function ScanOrb() {
  return (
    <div className="relative w-full h-full flex items-center justify-center perspective-2000">
      {/* Warm glow */}
      <div
        className="absolute w-72 h-72 rounded-full glow-pulse"
        style={{
          background: "radial-gradient(circle, rgba(245,158,11,0.15), transparent 70%)",
          filter: "blur(50px)",
        }}
      />
      {/* Teal accent glow */}
      <div
        className="absolute w-52 h-52 rounded-full glow-pulse"
        style={{
          background: "radial-gradient(circle, rgba(13,148,136,0.1), transparent 70%)",
          filter: "blur(35px)",
          animationDelay: "-2.5s",
        }}
      />

      {/* Orbital ring 1 */}
      <div
        className="absolute w-72 h-72 rounded-full border border-amber-500/8 spin-slow"
        style={{ transform: "rotateX(75deg)" }}
      >
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-amber-400/50" />
      </div>

      {/* Orbital ring 2 */}
      <div
        className="absolute w-56 h-56 rounded-full border border-teal-600/10 spin-reverse"
        style={{ transform: "rotateX(75deg) rotateZ(45deg)" }}
      >
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-teal-400/40" />
      </div>

      {/* Core orb */}
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.2, ease: [0.23, 1, 0.32, 1] }}
        className="relative float"
      >
        <div
          className="relative w-36 h-36 rounded-full preserve-3d"
          style={{
            background:
              "radial-gradient(circle at 35% 30%, rgba(251,191,36,0.18), rgba(217,119,6,0.06) 50%, transparent 80%)",
            border: "1px solid rgba(245,158,11,0.15)",
            boxShadow:
              "0 0 50px rgba(245,158,11,0.1), inset 0 0 30px rgba(245,158,11,0.04), inset 0 1px 0 rgba(255,255,255,0.08)",
          }}
        >
          {/* Scanline */}
          <div
            className="absolute inset-x-4 h-px scanline"
            style={{
              background: "linear-gradient(90deg, transparent, rgba(251,191,36,0.5), transparent)",
              boxShadow: "0 0 6px rgba(245,158,11,0.3)",
            }}
          />

          {/* Shield icon */}
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ transform: "translateZ(20px)" }}
          >
            <svg className="w-14 h-14" viewBox="0 0 40 40" fill="none" aria-hidden="true">
              <defs>
                <linearGradient id="orb-grad" x1="0" y1="0" x2="40" y2="40">
                  <stop stopColor="#fbbf24" />
                  <stop offset="0.5" stopColor="#f59e0b" />
                  <stop offset="1" stopColor="#d97706" />
                </linearGradient>
              </defs>
              <path
                d="M20 4l13 4.6v9.4c0 8.6-5.4 16.3-13 18.9C12.4 34.3 7 26.6 7 18V8.6L20 4z"
                fill="url(#orb-grad)"
                fillOpacity="0.15"
                stroke="url(#orb-grad)"
                strokeWidth="1.5"
              />
              <circle cx="20" cy="14" r="2.2" fill="url(#orb-grad)" />
              <circle cx="14" cy="23" r="2.2" fill="url(#orb-grad)" />
              <circle cx="26" cy="23" r="2.2" fill="url(#orb-grad)" />
              <path
                d="M20 14L14 23M20 14l6 9M14 23h12"
                stroke="url(#orb-grad)"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </div>

          {/* Highlight */}
          <div
            className="absolute top-2 left-1/2 -translate-x-1/2 w-16 h-6 rounded-full"
            style={{
              background: "radial-gradient(ellipse, rgba(255,255,255,0.1), transparent 70%)",
            }}
          />
        </div>
      </motion.div>

      {/* Floating data particles */}
      {[
        { left: "18%", top: "22%", delay: "0s", duration: "4s" },
        { left: "78%", top: "28%", delay: "-1.5s", duration: "3.5s" },
        { left: "30%", top: "72%", delay: "-2s", duration: "5s" },
        { left: "72%", top: "68%", delay: "-0.5s", duration: "4.5s" },
      ].map((p, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-amber-400/30 data-dot"
          style={{
            left: p.left,
            top: p.top,
            animationDelay: p.delay,
            animationDuration: p.duration,
            boxShadow: "0 0 4px rgba(245,158,11,0.4)",
          }}
        />
      ))}

      {/* Floating mini-cards — refined, fewer */}
      <motion.div
        initial={{ opacity: 0, x: -15, y: -8 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5 }}
        className="absolute -left-2 top-10 float-delayed"
        style={{ transform: "translateZ(40px)" }}
      >
        <div className="px-3 py-2 rounded-lg surface-2 shadow-warm-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
            <span className="text-[10px] font-mono-display text-rose-300">3 secrets leaked</span>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 15, y: 8 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ duration: 0.6, delay: 0.7 }}
        className="absolute -right-1 top-20 float"
        style={{ transform: "translateZ(30px)" }}
      >
        <div className="px-3 py-2 rounded-lg surface-2 shadow-warm-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="text-[10px] font-mono-display text-amber-300">SEO 72/100</span>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 10, y: 15 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ duration: 0.6, delay: 0.9 }}
        className="absolute right-6 -bottom-1 float-slow"
        style={{ transform: "translateZ(25px)" }}
      >
        <div className="px-3 py-2 rounded-lg surface-2 shadow-warm-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-teal-400" />
            <span className="text-[10px] font-mono-display text-teal-300">2 CVEs found</span>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: -10, y: 12 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ duration: 0.6, delay: 1.1 }}
        className="absolute -left-1 bottom-16 float-delayed"
        style={{ transform: "translateZ(35px)" }}
      >
        <div className="px-3 py-2 rounded-lg surface-2 shadow-warm-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-[10px] font-mono-display text-emerald-300">AEO 58/100</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
