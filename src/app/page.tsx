"use client";
import { useState, useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";
import { DashboardHome } from "@/components/DashboardHome";
import { GatewayKeysPanel } from "@/components/GatewayKeysPanel";
import { ProviderKeysPanel } from "@/components/ProviderKeysPanel";
import { LogsPanel } from "@/components/LogsPanel";
import { DocsPanel } from "@/components/DocsPanel";

export type Panel = "dashboard" | "gateway-keys" | "provider-keys" | "logs" | "docs";

export default function Home() {
  const [panel, setPanel] = useState<Panel>("dashboard");
  const [adminSecret, setAdminSecret] = useState("");
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    const saved = sessionStorage.getItem("admin_secret");
    if (saved) { setAdminSecret(saved); setAuthed(true); }
  }, []);

  if (!authed) {
    return <AuthScreen onAuth={(s) => { setAdminSecret(s); setAuthed(true); sessionStorage.setItem("admin_secret", s); }} />;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar active={panel} onNavigate={setPanel} />
      <main className="flex-1 overflow-auto grid-bg">
        {panel === "dashboard" && <DashboardHome adminSecret={adminSecret} />}
        {panel === "gateway-keys" && <GatewayKeysPanel adminSecret={adminSecret} />}
        {panel === "provider-keys" && <ProviderKeysPanel adminSecret={adminSecret} />}
        {panel === "logs" && <LogsPanel adminSecret={adminSecret} />}
        {panel === "docs" && <DocsPanel />}
      </main>
    </div>
  );
}

function AuthScreen({ onAuth }: { onAuth: (s: string) => void }) {
  const [val, setVal] = useState("");
  return (
    <div className="min-h-screen flex items-center justify-center grid-bg">
      <div className="cyber-card rounded-lg p-10 w-full max-w-md text-center">
        {/* Logo */}
        <div className="mb-8">
          <div className="text-5xl font-display font-black neon-pink tracking-widest mb-1">NANATWO</div>
          <div className="text-cyber-muted text-xs tracking-[0.3em] uppercase">AI Gateway System</div>
          <div className="mt-4 h-px bg-gradient-to-r from-transparent via-cyber-pink to-transparent" />
        </div>

        <div className="text-cyber-muted text-xs mb-6 tracking-widest uppercase">[ Admin Authentication Required ]</div>

        <input
          type="password"
          placeholder="Enter GATEWAY_SECRET"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && val && onAuth(val)}
          className="cyber-input w-full px-4 py-3 rounded text-sm mb-4"
        />
        <button
          onClick={() => val && onAuth(val)}
          className="cyber-btn w-full py-3 rounded font-display text-sm"
        >
          Initialize Access
        </button>

        <div className="mt-6 text-cyber-muted text-xs opacity-60">
          NanaTwo Gateway v1.0 · Powered by Vercel
        </div>
      </div>
    </div>
  );
}
