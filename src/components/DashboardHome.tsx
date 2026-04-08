"use client";
import { useEffect, useState } from "react";

interface Stats {
  totalRequests: number;
  fallbackRequests: number;
  activeGatewayKeys: number;
  activeProviderKeys: number;
  providers: Record<string, number>;
}

export function DashboardHome({ adminSecret }: { adminSecret: string }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [gkeys, setGkeys] = useState<any[]>([]);
  const [pkeys, setPkeys] = useState<any[]>([]);

  useEffect(() => {
    const h = { "x-admin-secret": adminSecret };
    Promise.all([
      fetch("/api/admin/logs?limit=200", { headers: h }).then((r) => r.json()),
      fetch("/api/admin/gateway-keys", { headers: h }).then((r) => r.json()),
      fetch("/api/admin/provider-keys", { headers: h }).then((r) => r.json()),
    ]).then(([l, g, p]) => {
      setLogs(Array.isArray(l) ? l : []);
      setGkeys(Array.isArray(g) ? g : []);
      setPkeys(Array.isArray(p) ? p : []);
    });
  }, [adminSecret]);

  const stats: Stats = {
    totalRequests: logs.length,
    fallbackRequests: logs.filter((l) => l.fallback_used).length,
    activeGatewayKeys: gkeys.filter((k) => k.isActive).length,
    activeProviderKeys: pkeys.filter((k) => k.isActive).length,
    providers: logs.reduce((acc, l) => { acc[l.provider] = (acc[l.provider] ?? 0) + 1; return acc; }, {} as Record<string, number>),
  };

  const successRate = logs.length ? Math.round((logs.filter((l) => l.status < 400).length / logs.length) * 100) : 100;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display font-black text-3xl neon-pink tracking-widest">SYSTEM STATUS</h1>
        <p className="text-cyber-muted text-sm mt-1 font-mono-cyber">NanaTwo AI Gateway · Real-time Overview</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Requests" value={stats.totalRequests} icon="▦" color="pink" />
        <StatCard label="Fallback Triggered" value={stats.fallbackRequests} icon="↺" color="purple" />
        <StatCard label="Gateway Keys" value={stats.activeGatewayKeys} icon="◈" color="pink" />
        <StatCard label="Provider Keys" value={stats.activeProviderKeys} icon="◉" color="purple" />
      </div>

      {/* Success rate + provider breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Success rate */}
        <div className="cyber-card rounded-lg p-6">
          <div className="text-cyber-muted text-xs tracking-widest uppercase mb-4 font-display">Success Rate</div>
          <div className="flex items-end gap-3 mb-4">
            <span className="font-display font-black text-5xl neon-pink">{successRate}%</span>
            <span className="text-cyber-muted text-sm mb-2">of {logs.length} requests</span>
          </div>
          <div className="h-2 bg-cyber-border rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyber-pink to-cyber-purple transition-all duration-1000"
              style={{ width: `${successRate}%` }}
            />
          </div>
        </div>

        {/* Provider breakdown */}
        <div className="cyber-card rounded-lg p-6">
          <div className="text-cyber-muted text-xs tracking-widest uppercase mb-4 font-display">Provider Traffic</div>
          <div className="space-y-3">
            {Object.entries(stats.providers).length === 0 && (
              <div className="text-cyber-muted text-sm font-mono-cyber">No requests yet</div>
            )}
            {Object.entries(stats.providers).map(([provider, count]) => (
              <div key={provider} className="flex items-center gap-3">
                <span className="text-cyber-pink-light text-xs font-mono-cyber w-20 uppercase">{provider}</span>
                <div className="flex-1 h-1.5 bg-cyber-border rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyber-pink to-cyber-purple rounded-full"
                    style={{ width: `${Math.round((count / logs.length) * 100)}%` }}
                  />
                </div>
                <span className="text-cyber-muted text-xs w-8 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent logs */}
      <div className="cyber-card rounded-lg p-6">
        <div className="text-cyber-muted text-xs tracking-widest uppercase mb-4 font-display">Recent Requests</div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono-cyber">
            <thead>
              <tr className="text-cyber-muted border-b border-cyber-border">
                <th className="text-left pb-2 pr-4">Time</th>
                <th className="text-left pb-2 pr-4">Provider</th>
                <th className="text-left pb-2 pr-4">Model</th>
                <th className="text-left pb-2 pr-4">Status</th>
                <th className="text-left pb-2 pr-4">Fallback</th>
                <th className="text-left pb-2">Latency</th>
              </tr>
            </thead>
            <tbody>
              {logs.slice(0, 10).map((log) => (
                <tr key={log.id} className="border-b border-cyber-border/30 hover:bg-cyber-pink/5 transition-colors">
                  <td className="py-2 pr-4 text-cyber-muted">{new Date(log.created_at).toLocaleTimeString()}</td>
                  <td className="py-2 pr-4 text-cyber-pink-light uppercase">{log.provider}</td>
                  <td className="py-2 pr-4 text-cyber-text">{log.model}</td>
                  <td className="py-2 pr-4">
                    <span className={`px-2 py-0.5 rounded text-xs ${log.status < 400 ? "badge-active" : "badge-error"}`}>
                      {log.status}
                    </span>
                  </td>
                  <td className="py-2 pr-4">
                    {log.fallback_used ? (
                      <span className="text-cyber-purple text-xs">↺ {log.fallback_attempts}x</span>
                    ) : (
                      <span className="text-cyber-muted">—</span>
                    )}
                  </td>
                  <td className="py-2 text-cyber-muted">{log.latency_ms}ms</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr><td colSpan={6} className="py-8 text-center text-cyber-muted">No requests logged yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: string; color: "pink" | "purple" }) {
  return (
    <div className="cyber-card rounded-lg p-5">
      <div className="flex items-start justify-between mb-3">
        <span className={`text-2xl ${color === "pink" ? "neon-pink" : "neon-purple"}`}>{icon}</span>
        <span className="text-cyber-muted text-xs font-mono-cyber tracking-widest uppercase">{label}</span>
      </div>
      <div className={`font-display font-black text-4xl ${color === "pink" ? "neon-pink" : "neon-purple"}`}>{value}</div>
    </div>
  );
}
