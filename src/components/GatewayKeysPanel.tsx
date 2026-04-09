"use client";
import { useEffect, useState, useCallback } from "react";

interface GatewayKey {
  id: string;
  name: string;
  keyPrefix: string;
  isActive: boolean;
  totalRequests: number;
  createdAt: string;
  lastUsedAt: string | null;
}

export function GatewayKeysPanel({ adminSecret }: { adminSecret: string }) {
  const [keys, setKeys] = useState<GatewayKey[]>([]);
  const [name, setName] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const h = { "x-admin-secret": adminSecret, "Content-Type": "application/json" };

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/gateway-keys", { headers: h });
      const data = await res.json();
      if (!res.ok) { setErr(data.error ?? `Error ${res.status}`); return; }
      setKeys(Array.isArray(data) ? data : []);
    } catch (e) { setErr(String(e)); }
  }, [adminSecret]);

  useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!name.trim()) return;
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/gateway-keys", {
        method: "POST", headers: h, body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error ?? `Server error ${res.status}`);
      } else if (!data.key) {
        setErr("Key was created but not returned — check Vercel logs");
      } else {
        setNewKey(data.key);
        setName("");
        await load();
      }
    } catch (e) {
      setErr(`Network error: ${String(e)}`);
    } finally {
      setLoading(false);
    }
  };

  const revoke = async (id: string) => {
    try {
      await fetch("/api/admin/gateway-keys", { method: "DELETE", headers: h, body: JSON.stringify({ id }) });
      await load();
    } catch (e) { setErr(String(e)); }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-display font-black text-3xl neon-pink tracking-widest">GATEWAY KEYS</h1>
        <p className="text-cyber-muted text-sm mt-1 font-mono-cyber">Keys used to authenticate requests to NanaTwo</p>
      </div>

      {/* Error banner */}
      {err && (
        <div className="cyber-card rounded-lg p-4 mb-6 border-cyber-pink/60 bg-cyber-pink/5">
          <div className="text-cyber-pink text-xs font-mono-cyber">⚠ {err}</div>
          <button onClick={() => setErr(null)} className="text-cyber-muted text-xs mt-1 hover:text-cyber-text">Dismiss</button>
        </div>
      )}

      {/* New key revealed */}
      {newKey && (
        <div className="cyber-card rounded-lg p-5 mb-6 border-cyber-pink/60">
          <div className="text-cyber-pink text-xs font-display tracking-widest mb-2">⚠ SAVE THIS KEY — SHOWN ONCE</div>
          <code className="text-cyber-text font-mono-cyber text-sm break-all bg-cyber-darker px-3 py-2 rounded block">{newKey}</code>
          <div className="flex gap-3 mt-3">
            <button onClick={() => navigator.clipboard.writeText(newKey)} className="cyber-btn px-4 py-2 rounded text-xs">
              Copy to Clipboard
            </button>
            <button onClick={() => setNewKey(null)} className="text-cyber-muted text-xs hover:text-cyber-text">Dismiss</button>
          </div>
        </div>
      )}

      {/* Create form */}
      <div className="cyber-card rounded-lg p-6 mb-6">
        <div className="text-cyber-muted text-xs tracking-widest uppercase mb-4 font-display">Create New Key</div>
        <div className="flex gap-3">
          <input
            className="cyber-input flex-1 px-4 py-2.5 rounded text-sm"
            placeholder="Key name (e.g. Production App)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !loading && create()}
          />
          <button onClick={create} disabled={loading} className="cyber-btn px-6 py-2.5 rounded disabled:opacity-50">
            {loading ? "Generating..." : "Generate"}
          </button>
        </div>
      </div>

      {/* Keys table */}
      <div className="cyber-card rounded-lg p-6">
        <div className="text-cyber-muted text-xs tracking-widest uppercase mb-4 font-display">Active Keys</div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono-cyber">
            <thead>
              <tr className="text-cyber-muted border-b border-cyber-border">
                <th className="text-left pb-2 pr-4">Name</th>
                <th className="text-left pb-2 pr-4">Key Prefix</th>
                <th className="text-left pb-2 pr-4">Status</th>
                <th className="text-left pb-2 pr-4">Requests</th>
                <th className="text-left pb-2 pr-4">Last Used</th>
                <th className="text-left pb-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => (
                <tr key={k.id} className="border-b border-cyber-border/30 hover:bg-cyber-pink/5">
                  <td className="py-3 pr-4 text-cyber-text">{k.name}</td>
                  <td className="py-3 pr-4 text-cyber-pink-light">{k.keyPrefix}...</td>
                  <td className="py-3 pr-4">
                    <span className={`px-2 py-0.5 rounded text-xs ${k.isActive ? "badge-active" : "badge-inactive"}`}>
                      {k.isActive ? "Active" : "Revoked"}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-cyber-muted">{k.totalRequests}</td>
                  <td className="py-3 pr-4 text-cyber-muted">{k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleDateString() : "Never"}</td>
                  <td className="py-3">
                    {k.isActive && (
                      <button onClick={() => revoke(k.id)} className="text-cyber-pink hover:text-red-400 text-xs transition-colors">
                        Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {keys.length === 0 && (
                <tr><td colSpan={6} className="py-8 text-center text-cyber-muted">No keys yet — create one above</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
