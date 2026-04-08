"use client";
import { useEffect, useState, useCallback } from "react";

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
  customEndpoint?: string | null;
  customAuthStyle?: string | null;
  customAuthHeader?: string | null;
  customAuthQuery?: string | null;
}

const BUILTIN_PROVIDERS = ["openai", "anthropic", "google", "cohere", "mistral"];

const AUTH_STYLES = [
  { value: "bearer", label: "Bearer Token — Authorization: Bearer <key>" },
  { value: "header", label: "Custom Header — e.g. X-API-Key: <key>" },
  { value: "query",  label: "Query Param — e.g. ?api_key=<key>" },
  { value: "none",   label: "No Auth — open endpoint" },
];

const EMPTY_FORM = {
  name: "", apiKey: "", priority: 1,
  customEndpoint: "", customAuthStyle: "bearer",
  customAuthHeader: "", customAuthQuery: "", customHeaders: "",
};

type FormState = typeof EMPTY_FORM;

function AddKeyModal({
  provider, isFallback, nextPriority, adminSecret, onClose, onSaved,
}: {
  provider: string;
  isFallback: boolean;
  nextPriority: number;
  adminSecret: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<FormState>({ ...EMPTY_FORM, priority: nextPriority });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const isCustom = provider === "custom";

  const save = async () => {
    setErr("");
    if (!form.name.trim()) return setErr("Name is required");
    if (isCustom && !form.customEndpoint.trim()) return setErr("Endpoint URL is required");
    if (!isCustom && !form.apiKey.trim()) return setErr("API key is required");

    let parsedHeaders: Record<string, string> | null = null;
    if (form.customHeaders.trim()) {
      try { parsedHeaders = JSON.parse(form.customHeaders); }
      catch { return setErr('Extra Headers must be valid JSON, e.g. {"X-Org": "val"}'); }
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/provider-keys", {
        method: "POST",
        headers: { "x-admin-secret": adminSecret, "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          name: form.name.trim(),
          apiKey: form.apiKey || undefined,
          priority: form.priority,
          customEndpoint: isCustom ? form.customEndpoint : undefined,
          customAuthStyle: isCustom ? form.customAuthStyle : undefined,
          customAuthHeader: isCustom && form.customAuthStyle === "header" ? form.customAuthHeader : undefined,
          customAuthQuery: isCustom && form.customAuthStyle === "query" ? form.customAuthQuery : undefined,
          customHeaders: parsedHeaders,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErr(data.error ?? `Server error ${res.status}`);
      } else {
        onSaved(); // reload list
        onClose(); // close modal
      }
    } catch (e) {
      setErr("Network error — check console");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="cyber-card rounded-lg w-full max-w-lg mx-4 p-6">

        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="font-display text-sm tracking-widest uppercase neon-pink">
              {isFallback ? "↺ Add Fallback Key" : "◈ Add Primary Key"}
            </div>
            <div className="text-cyber-muted text-xs mt-1 font-mono-cyber">
              Provider: <span className="text-cyber-pink uppercase">{provider}</span>
              {isFallback && <span className="ml-2 text-cyber-purple">· Fallback slot #{form.priority - 1}</span>}
            </div>
          </div>
          <button onClick={onClose} className="text-cyber-muted hover:text-cyber-pink text-xl leading-none">✕</button>
        </div>

        {isFallback && (
          <div className="bg-cyber-purple/10 border border-cyber-purple/30 rounded p-3 mb-4 text-xs font-mono-cyber text-cyber-muted">
            ↺ Auto-used when higher-priority keys fail (401, 429, quota exceeded, etc.)
          </div>
        )}

        <div className="mb-3">
          <label className="text-cyber-muted text-xs mb-1 block">Key Name *</label>
          <input
            autoFocus
            className="cyber-input w-full px-3 py-2.5 rounded text-sm"
            placeholder={isFallback ? "e.g. Fallback Key 1" : "e.g. Primary Key"}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>

        {isCustom && (
          <div className="border border-cyber-purple/30 rounded-lg p-4 mb-3 bg-cyber-purple/5 space-y-3">
            <div className="text-cyber-purple text-xs font-display tracking-widest">CUSTOM ENDPOINT</div>
            <div>
              <label className="text-cyber-muted text-xs mb-1 block">Endpoint URL *</label>
              <input
                className="cyber-input w-full px-3 py-2.5 rounded text-sm"
                placeholder="https://my-llm.com/v1/chat/completions"
                value={form.customEndpoint}
                onChange={(e) => setForm({ ...form, customEndpoint: e.target.value })}
              />
            </div>
            <div>
              <label className="text-cyber-muted text-xs mb-1 block">Auth Style</label>
              <select
                className="cyber-input w-full px-3 py-2.5 rounded text-sm"
                value={form.customAuthStyle}
                onChange={(e) => setForm({ ...form, customAuthStyle: e.target.value })}
              >
                {AUTH_STYLES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            {form.customAuthStyle === "header" && (
              <div>
                <label className="text-cyber-muted text-xs mb-1 block">Header Name</label>
                <input className="cyber-input w-full px-3 py-2.5 rounded text-sm" placeholder="X-API-Key"
                  value={form.customAuthHeader} onChange={(e) => setForm({ ...form, customAuthHeader: e.target.value })} />
              </div>
            )}
            {form.customAuthStyle === "query" && (
              <div>
                <label className="text-cyber-muted text-xs mb-1 block">Query Param Name</label>
                <input className="cyber-input w-full px-3 py-2.5 rounded text-sm" placeholder="api_key"
                  value={form.customAuthQuery} onChange={(e) => setForm({ ...form, customAuthQuery: e.target.value })} />
              </div>
            )}
            <div>
              <label className="text-cyber-muted text-xs mb-1 block">Extra Headers <span className="opacity-50">(optional JSON)</span></label>
              <input className="cyber-input w-full px-3 py-2.5 rounded text-sm font-mono-cyber"
                placeholder='{"X-Org-Id": "my-org"}'
                value={form.customHeaders} onChange={(e) => setForm({ ...form, customHeaders: e.target.value })} />
            </div>
          </div>
        )}

        <div className="mb-4">
          <label className="text-cyber-muted text-xs mb-1 block">
            API Key{isCustom ? <span className="opacity-50"> (leave blank if no auth)</span> : " *"}
          </label>
          <input
            type="password"
            className="cyber-input w-full px-3 py-2.5 rounded text-sm"
            placeholder={isCustom ? "your-api-key (optional)" : "sk-..."}
            value={form.apiKey}
            onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && !loading && save()}
          />
        </div>

        {err && (
          <div className="text-cyber-pink text-xs font-mono-cyber mb-3 bg-cyber-pink/10 border border-cyber-pink/30 rounded px-3 py-2">
            ⚠ {err}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={save}
            disabled={loading}
            className="cyber-btn flex-1 py-2.5 rounded font-display text-xs tracking-widest disabled:opacity-50"
          >
            {loading ? "Saving..." : isFallback ? "↺ Add Fallback Key" : "◈ Add Primary Key"}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded border border-cyber-border text-cyber-muted text-xs hover:text-cyber-text transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function ProviderGroup({
  provider, keys, adminSecret, onRefresh,
}: {
  provider: string;
  keys: ProviderKey[];
  adminSecret: string;
  onRefresh: () => void;
}) {
  const [modal, setModal] = useState<{ isFallback: boolean } | null>(null);
  const sorted = [...keys].sort((a, b) => a.priority - b.priority);
  const nextPriority = sorted.length > 0 ? Math.max(...sorted.map(k => k.priority)) + 1 : 2;

  const remove = async (id: string) => {
    await fetch("/api/admin/provider-keys", {
      method: "DELETE",
      headers: { "x-admin-secret": adminSecret, "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    onRefresh();
  };

  const handleSaved = () => {
    onRefresh();
  };

  return (
    <>
      {modal && (
        <AddKeyModal
          provider={provider}
          isFallback={modal.isFallback}
          nextPriority={modal.isFallback ? nextPriority : 1}
          adminSecret={adminSecret}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}

      <div className="cyber-card rounded-lg p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className={`font-display text-sm tracking-widest uppercase ${provider === "custom" ? "neon-purple" : "neon-pink"}`}>
              {provider === "custom" ? "⬡ CUSTOM" : provider}
            </span>
            <span className="text-cyber-muted text-xs font-mono-cyber">
              {sorted.length} key{sorted.length !== 1 ? "s" : ""}
              {sorted.length > 1 && (
                <span className="text-cyber-purple ml-1">
                  · {sorted.length - 1} fallback{sorted.length - 1 !== 1 ? "s" : ""}
                </span>
              )}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setModal({ isFallback: false })}
              className="cyber-btn px-3 py-1.5 rounded text-xs"
            >
              + Add Key
            </button>
            <button
              onClick={() => setModal({ isFallback: true })}
              className="px-3 py-1.5 rounded text-xs border border-cyber-purple/60 text-cyber-purple hover:bg-cyber-purple/20 transition-colors font-display tracking-widest"
            >
              ↺ Add Fallback Key
            </button>
          </div>
        </div>

        {sorted.length === 0 ? (
          <div className="text-cyber-muted text-xs font-mono-cyber py-2">
            No keys yet — click <span className="text-cyber-pink">+ Add Key</span> to add the primary key.
          </div>
        ) : (
          <div className="space-y-2">
            {sorted.map((k, idx) => (
              <div key={k.id} className="relative">
                {idx < sorted.length - 1 && (
                  <div className="absolute left-[19px] top-full w-px h-2 bg-cyber-purple/40 z-10" />
                )}
                <div className={`flex items-center gap-3 rounded px-4 py-3 border ${
                  k.priority === 1
                    ? "bg-cyber-pink/5 border-cyber-pink/30"
                    : "bg-cyber-darker border-cyber-border/50"
                }`}>
                  <span className={`w-3 h-3 rounded-full flex-shrink-0 ${
                    k.priority === 1 ? "bg-cyber-pink animate-pulse" : "bg-cyber-purple/60"
                  }`} />

                  <div className="flex-shrink-0 w-24">
                    {k.priority === 1 ? (
                      <span className="text-cyber-pink text-xs font-display tracking-widest">PRIMARY</span>
                    ) : (
                      <span className="text-cyber-purple text-xs font-display tracking-widest">FALLBACK {k.priority - 1}</span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <span className="text-cyber-text text-xs">{k.name}</span>
                    {k.customEndpoint && (
                      <div className="text-cyber-muted text-xs truncate mt-0.5">→ {k.customEndpoint}</div>
                    )}
                  </div>

                  <span className="text-cyber-muted text-xs font-mono-cyber flex-shrink-0">{k.keyPreview}</span>

                  {k.customAuthStyle && (
                    <span className="text-cyber-purple text-xs border border-cyber-purple/40 px-2 py-0.5 rounded flex-shrink-0">
                      {k.customAuthStyle}
                    </span>
                  )}

                  <span className="text-green-400 text-xs flex-shrink-0">✓{k.successCount}</span>
                  <span className={`text-xs flex-shrink-0 ${k.errorCount > 0 ? "text-cyber-pink" : "text-cyber-muted"}`}>
                    ✗{k.errorCount}
                  </span>

                  <button
                    onClick={() => remove(k.id)}
                    className="text-cyber-muted hover:text-cyber-pink text-xs transition-colors flex-shrink-0 ml-1"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}

            {sorted.length > 1 && (
              <div className="mt-3 text-xs font-mono-cyber text-cyber-muted bg-cyber-darker rounded px-4 py-2 border border-cyber-border/30">
                ↺ Fallback order: {sorted.map(k => k.name).join(" → ")}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

export function ProviderKeysPanel({ adminSecret }: { adminSecret: string }) {
  const [keys, setKeys] = useState<ProviderKey[]>([]);
  const [showNewProvider, setShowNewProvider] = useState(false);
  const [newProviderName, setNewProviderName] = useState("");
  const [addModal, setAddModal] = useState<{ provider: string; isFallback: boolean } | null>(null);

  const load = useCallback(() => {
    fetch("/api/admin/provider-keys", { headers: { "x-admin-secret": adminSecret } })
      .then((r) => r.json())
      .then((d) => setKeys(Array.isArray(d) ? d : []));
  }, [adminSecret]);

  useEffect(() => { load(); }, [load]);

  const activeProviders = Array.from(new Set([
    ...BUILTIN_PROVIDERS,
    "custom",
    ...keys.map(k => k.provider),
  ]));

  const grouped = activeProviders.reduce((acc, p) => {
    acc[p] = keys.filter(k => k.provider === p);
    return acc;
  }, {} as Record<string, ProviderKey[]>);

  const addCustomProvider = () => {
    const name = newProviderName.trim().toLowerCase().replace(/\s+/g, "-");
    if (!name) return;
    setAddModal({ provider: name, isFallback: false });
    setShowNewProvider(false);
    setNewProviderName("");
  };

  return (
    <div className="p-8">
      {addModal && (
        <AddKeyModal
          provider={addModal.provider}
          isFallback={addModal.isFallback}
          nextPriority={addModal.isFallback ? (grouped[addModal.provider]?.length ?? 0) + 2 : 1}
          adminSecret={adminSecret}
          onClose={() => setAddModal(null)}
          onSaved={() => { load(); setAddModal(null); }}
        />
      )}

      <div className="mb-8">
        <h1 className="font-display font-black text-3xl neon-pink tracking-widest">PROVIDER KEYS</h1>
        <p className="text-cyber-muted text-sm mt-1 font-mono-cyber">
          Each provider has a primary key + unlimited fallback keys. NanaTwo auto-rotates on errors.
        </p>
      </div>

      <div className="cyber-card rounded-lg p-4 mb-6 border-cyber-purple/30">
        <div className="flex items-start gap-3">
          <span className="text-cyber-purple text-lg mt-0.5">↺</span>
          <div className="text-xs font-mono-cyber text-cyber-muted">
            <span className="text-cyber-purple">HOW FALLBACK WORKS — </span>
            NanaTwo tries the <span className="text-cyber-pink">PRIMARY</span> key first.
            On 401, 403, 429, or 5xx it instantly retries with{" "}
            <span className="text-cyber-purple">FALLBACK 1</span>, then{" "}
            <span className="text-cyber-purple">FALLBACK 2</span>, etc. — fully automatic.
          </div>
        </div>
      </div>

      {activeProviders.map((provider) => (
        <ProviderGroup
          key={provider}
          provider={provider}
          keys={grouped[provider] ?? []}
          adminSecret={adminSecret}
          onRefresh={load}
        />
      ))}

      <div className="cyber-card rounded-lg p-5 border-dashed border-cyber-border">
        {!showNewProvider ? (
          <button
            onClick={() => setShowNewProvider(true)}
            className="w-full text-cyber-muted text-xs font-mono-cyber hover:text-cyber-pink transition-colors text-center py-1"
          >
            + Add a custom-named provider (e.g. "groq", "together-ai", "my-llm")
          </button>
        ) : (
          <div className="flex gap-3 items-center">
            <input
              autoFocus
              className="cyber-input flex-1 px-3 py-2 rounded text-sm"
              placeholder='Provider name, e.g. "groq" or "my-llm-server"'
              value={newProviderName}
              onChange={(e) => setNewProviderName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCustomProvider()}
            />
            <button onClick={addCustomProvider} className="cyber-btn px-4 py-2 rounded text-xs">Continue</button>
            <button onClick={() => setShowNewProvider(false)} className="text-cyber-muted text-xs hover:text-cyber-text">Cancel</button>
          </div>
        )}
      </div>
    </div>
  );
}
