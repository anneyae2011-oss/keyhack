"use client";
import { useEffect, useState } from "react";

export function LogsPanel({ adminSecret }: { adminSecret: string }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [filter, setFilter] = useState("");

  const load = () =>
    fetch("/api/admin/logs?limit=500", { headers: { "x-admin-secret": adminSecret } })
      .then((r) => r.json()).then((d) => setLogs(Array.isArray(d) ? d : []));

  useEffect(() => { load(); const t = setInterval(load, 10000); return () => clearInterval(t); }, []);

  const filtered = logs.filter((l) =>
    !filter || l.provider?.includes(filter) || l.model?.includes(filter) || String(l.status).includes(filter)
  );

  return (
    <div className="p-8">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="font-display font-black text-3xl neon-pink tracking-widest">REQUEST LOGS</h1>
          <p className="text-cyber-muted text-sm mt-1 font-mono-cyber">Live feed · auto-refreshes every 10s</p>
        </div>
        <button onClick={load} className="cyber-btn px-4 py-2 rounded text-xs">↺ Refresh</button>
      </div>

      <div className="mb-4">
        <input
          className="cyber-input px-4 py-2.5 rounded text-sm w-64"
          placeholder="Filter by provider, model, status..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      <div className="cyber-card rounded-lg p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono-cyber">
            <thead>
              <tr className="text-cyber-muted border-b border-cyber-border">
                <th className="text-left pb-2 pr-3">Time</th>
                <th className="text-left pb-2 pr-3">Provider</th>
                <th className="text-left pb-2 pr-3">Model</th>
                <th className="text-left pb-2 pr-3">Status</th>
                <th className="text-left pb-2 pr-3">Tokens</th>
                <th className="text-left pb-2 pr-3">Latency</th>
                <th className="text-left pb-2 pr-3">Fallback</th>
                <th className="text-left pb-2">Error</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((log) => (
                <tr key={log.id} className="border-b border-cyber-border/20 hover:bg-cyber-pink/5 transition-colors">
                  <td className="py-2 pr-3 text-cyber-muted whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="py-2 pr-3 text-cyber-pink-light uppercase">{log.provider}</td>
                  <td className="py-2 pr-3 text-cyber-text">{log.model}</td>
                  <td className="py-2 pr-3">
                    <span className={`px-2 py-0.5 rounded ${log.status < 400 ? "badge-active" : "badge-error"}`}>
                      {log.status}
                    </span>
                  </td>
                  <td className="py-2 pr-3 text-cyber-muted">
                    {(log.prompt_tokens ?? 0) + (log.completion_tokens ?? 0)}
                  </td>
                  <td className="py-2 pr-3 text-cyber-muted">{log.latency_ms}ms</td>
                  <td className="py-2 pr-3">
                    {log.fallback_used ? (
                      <span className="text-cyber-purple">↺ {log.fallback_attempts}x</span>
                    ) : <span className="text-cyber-muted">—</span>}
                  </td>
                  <td className="py-2 text-cyber-pink text-xs max-w-xs truncate">
                    {log.error ? log.error.slice(0, 60) + "..." : "—"}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="py-8 text-center text-cyber-muted">No logs found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
