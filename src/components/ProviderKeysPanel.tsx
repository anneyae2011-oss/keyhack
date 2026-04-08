"use client";
import { useEffect, useState } from "react";

interface ProviderKey {
  id: string;
  provider: string;
  name: string;
  keyPreview: string;
  priority: number;
  isActive: boolean;
  errorCount: number;
  successCount: number;
  lastErrorAt: string | null;
  lastUsedAt: string | null;
}

const PROVIDERS = ["openai", "anthropic", "google", "cohere", "mistral"];

export function ProviderKeysPanel({ adminSecret }: { adminSecret: string }) {
  const [keys, setKeys] = useState<ProviderKey[]>([]);
  const [form, setForm] = useState({ provider: "openai", name: "", apiKey: "", priority: "1" });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const headers = { "x-admin-secret": adminSecret, "Content-Type": "application/json" };

  const load = () =>
    fetch("/api/admin/provider-keys", { headers }).then((r) => r.json()).then((d) => setKeys(Array.isArray(d) ? d : []));

  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!form.name || !form.apiKey) return;
    setLoading(true);
    const res = await fetch("/api/admin/provider-keys", {
      method: "POST", headers,
      body: JSON.stringify({ ...form, priority: parseInt(form.priority) }),
    });
    if (res.ok) {
      setMsg("Key added successfully");
      setForm({ provider: "openai", name: "", apiKey: "", priority: "1" });
      await load();
    } else {
      setMsg("Error adding key");
    }
    setLoading(false);
    setTimeout(() => setMsg(""), 3000);
  };

  const remove = async (id: string) => {
    await fetch("/api/admin/provider-keys", { method: "DELETE", headers, body: JSON.stringify({ id }) });
    await load();
  };

  const grouped = PROVIDERS.reduce((acc, p) => {
    acc[p] = keys.filter((k) => k.provider === p).sort((a, b) => a.priority - b.priority);
    return acc;
  }, {} as Record<string, ProviderKey[]>);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-display font-black text-3xl neon-pink tracking-widest">PROVIDER KEYS</h1>
        <p className="text-cyber-muted text-sm mt-1 font-mono-cyber">
          Add multiple keys per provider. Priority 1 = primary, 2+ = fallback. Errors auto-rotate to next key.
        </p>
      </div>

      {/* Add form */}
      <div className="cyber-card rounded-lg p-6 mb-6">
        <div className="text-cyber-muted text-xs tracking-widest uppercase mb-4 font-display">Add Provider Key</div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-cyber-muted text-xs mb-1 block">Provider</label>
            <select
              className="cyber-input w-full px-3 py-2.5 rounded text-sm"
              value={form.provider}
              onChange={(e) => setForm({ ...form, provider: e.target.value })}
            >
              {PROVIDERS.map((p) => <option key={p} value={p}>{p.toUpperCase()}</option>)}
            </select>
          </div>
          <div>
            <label className="text-cyber-muted text-xs mb-1 block">Priority (1=primary, 2+=fallback)</label>
            <input
              type="number" min="1"
              className="cyber-input w-full px-3 py-2.5 rounded text-sm"
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="text-cyber-muted text-xs mb-1 block">Key Name</label>
            <input
              className="cyber-input w-full px-3 py-2.5 rounded text-sm"
              placeholder="e.g. OpenAI Primary"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <label className="text-cyber-muted text-xs mb-1 block">API Key</label>
            <input
              type="password"
              className="cyber-input w-full px-3 py-2.5 rounded text-sm"
              placeholder="sk-..."
              value={form.apiKey}
              onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={add} disabled={loading} className="cyber-btn px-6 py-2.5 rounded">
            {loading ? "Adding..." : "Add Key"}
          </button>
          {msg && <span className="text-cyber-pink text-xs font-mono-cyber">{msg}</span>}
        </div>
      </div>

      {/* Fallback explanation */}
      <div className="cyber-card rounded-lg p-4 mb-6 border-cyber-purple/40">
        <div className="flex items-start gap-3">
          <span className="text-cyber-purple text-xl">↺</span>
          <div>
            <div className="text-cyber-purple text-xs font-display tracking-widest mb-1">AUTOMATIC FALLBACK ACTIVE</div>
            <div className="text-cyber-muted text-xs font-mono-cyber">
              When a key returns 401, 403, 429, 500, 502, 503, or 504 — NanaTwo automatically retries with the next priority key.
              All fallback attempts are logged with the <code className="text-cyber-pink">X-NanaTwo-Fallback-Used</code> header.
            </div>
          </div>
        </div>
      </div>

      {/* Keys by provider */}
      {PROVIDERS.map((provider) => (
        <div key={provider} className="cyber-card rounded-lg p-6 mb-4">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-cyber-pink font-display text-xs tracking-widest uppercase">{provider}</span>
            <span className="text-cyber-muted text-xs">({grouped[provider].length} keys)</span>
          </div>
          {grouped[provider].length === 0 ? (
            <div className="text-cyber-muted text-xs font-mono-cyber">No keys configured</div>
          ) : (
            <div className="space-y-2">
              {grouped[provider].map((k) => (
                <div key={k.id} className="flex items-center gap-4 bg-cyber-darker rounded px-4 py-3 border border-cyber-border/50">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${k.priority === 1 ? "bg-cyber-pink animate-pulse" : "bg-cyber-purple"}`} />
                    <span className="text-cyber-muted text-xs">P{k.priority}</span>
                  </div>
                  <span className="text-cyber-text text-xs flex-1">{k.name}</span>
                  <span className="text-cyber-muted text-xs font-mono-cyber">{k.keyPreview}</span>
                  <span className={`px-2 py-0.5 rounded text-xs ${k.isActive ? "badge-active" : "badge-inactive"}`}>
                    {k.isActive ? "Active" : "Off"}
                  </span>
                  <span className="text-green-400 text-xs">✓ {k.successCount}</span>
                  <span className="text-cyber-pink text-xs">✗ {k.errorCount}</span>
                  {k.isActive && (
                    <button onClick={() => remove(k.id)} className="text-cyber-muted hover:text-cyber-pink text-xs transition-colors">
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
