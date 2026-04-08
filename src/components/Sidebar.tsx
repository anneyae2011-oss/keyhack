"use client";
import { Panel } from "@/app/page";

const NAV = [
  { id: "dashboard", label: "Dashboard", icon: "⬡" },
  { id: "gateway-keys", label: "Gateway Keys", icon: "◈" },
  { id: "provider-keys", label: "Provider Keys", icon: "◉" },
  { id: "logs", label: "Request Logs", icon: "▦" },
  { id: "docs", label: "API Docs", icon: "◎" },
] as const;

export function Sidebar({ active, onNavigate }: { active: Panel; onNavigate: (p: Panel) => void }) {
  return (
    <aside className="w-64 flex-shrink-0 bg-cyber-darker border-r border-cyber-border flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-cyber-border">
        <div className="font-display font-black text-2xl neon-pink tracking-widest">NANATWO</div>
        <div className="text-cyber-muted text-xs tracking-[0.2em] mt-1">AI GATEWAY</div>
        <div className="mt-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-green-400 text-xs font-mono-cyber">ONLINE</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1">
        {NAV.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id as Panel)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded text-sm transition-all text-left ${
              active === item.id
                ? "bg-cyber-pink/20 border border-cyber-pink/60 text-cyber-pink shadow-cyber-pink"
                : "text-cyber-muted hover:text-cyber-text hover:bg-cyber-card border border-transparent"
            }`}
          >
            <span className="text-lg">{item.icon}</span>
            <span className="font-mono-cyber tracking-wide">{item.label}</span>
            {active === item.id && <span className="ml-auto text-cyber-pink text-xs">▶</span>}
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-cyber-border">
        <div className="text-cyber-muted text-xs text-center font-mono-cyber opacity-60">
          v1.0.0 · keyhack
        </div>
      </div>
    </aside>
  );
}
