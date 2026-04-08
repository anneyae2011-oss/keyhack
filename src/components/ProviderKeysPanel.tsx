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
  customEndpoint?: string | null;
  customAuthStyle?: string | null;
}

const BUILTIN_PROVIDERS = ["openai", "anthropic", "google", "cohere", "mistral"];
const AUTH_STYLES = [
  { value: "bearer", label: "Bearer Token  (Authorization: Bearer <key>)" },
  { value: "header", label: "Custom Header  (e.g. X-API-Key: <key>)" },
  { value: "query",  label: "Query Param   (e.g. ?api_key=<key>)" },
  { value: "none",   label: "No Auth       (open endpoint)" },
];

const DEFAULT_FORM = {
  provider: "openai",
  name: "",
  apiKey: "",
  priority: "1",
  // custom fields
  customEndpoint: "",
  customAuthStyle: "bearer",
  customAuthHeader: "",
  customAuthQuery: "",
  customHeaders: "",   // JSON string
};

export function ProviderKeysPanel({ adminSecret }: { adminSecret: string }) {
  const [keys, setKeys] = useState<ProviderKey[]>([]);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const headers = { "x-admin-secret": adminSecret, "Content-Type": "application/json" };
  const isCustom = form.provider === "custom";

  const load = () =>
    fetch("/api/admin/provider-keys", { headers })
      .then((r) => r.json())
      .then((d) => setKeys(Array.isArray(d) ? d : []));

  useEffect(() => { load(); }, []);

  const flash = (text: string, ok = true) => {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 3000);
  };

  const add = async () => {
    if (!form.name) return flash("Name is required", false);
    if (isCustom && !form.customEndpoint) return flash("Endpoint URL is required for custom providers", false);
    if (!isCustom && !form.apiKey) return flash("API key is required", false);

    // Parse extra headers JSON if provided
    let parsedHeaders: Record<string, string> | null = null;
    if (form.customHeaders.trim()) {
      try {
        parsedHeaders = JSON.parse(form.customHeaders);
      } catch {
        return flash("Extra Headers must be valid JSON, e.g. {\"X-Org\": \"my-org\"}", false);
      }
    }

    setLoading(true);
    const res = await fetch("/api/admin/provider-keys", {
      method: "POST",
      headers,
      body: JSON.stringify({
        provider: form.provider,
        name: form.name,
        apiKey: form.apiKey || undefined,
        priority: parseInt(form.priority),
        customEndpoint: isCustom ? form.customEndpoint : undefined,
        customAuthStyle: isCustom ? form.customAuthStyle : undefined,
        customAuthHeader: isCustom && form.customAuthStyle === "header" ? form.customAuthHeader : undefined,
        customAuthQuery: isCustom && form.customAuthStyle === "query" ? form.customAuthQuery : undefined,
        customHeaders: parsedHeaders,
      }),
    });

    if (res.ok) {
      flash("Key added successfully");
      setForm(DEFAULT_FORM);
      await load();
    } else {
      const err = await res.json();
      flash(err.error ?? "Error adding key", false);
    }
    setLoading(false);
  };

  const remove = async (id: string) => {
    await fetch("/api/admin/provider-keys", { method: "DELETE", headers, body: JSON.stringify({ id }) });
    await load();
  };

  // Group: built-in providers + any custom provider names
  const allProviders = [...new Set(["openai", "anthropic", "google", "cohere", "mistral", "custom",
    ...keys.filter(k => !BUILTIN_PROVIDERS.includes(k.provider)).map(k => k.provider)])];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-display font-black text-3xl neon-pink tracking-widest">PROVIDER KEYS</h1>
        <p className="text-cyber-muted text-sm mt-1 font-mono-cyber">
          Add keys for any provider — built-in or fully custom endpoint. Priority 1 = primary, 2+ = fallback.
        </p>
      </div>

      {/* Fallback info banner */}
      <div className="cyber-card rounded-lg p-4 mb-6 border-cyber-purple/40">
        <div className="flex items-start gap-3">
          <span className="text-cyber-purple text-xl mt-0.5">↺</span>
          <div className="text-cyber-muted text-xs font-mono-cyber">
            <span className="text-cyber-purple font-display tracking-widest">AUTOMATIC FALLBACK ACTIVE — </span>
            On 401, 403, 429, 5xx errors NanaTwo retries with the next priority key automatically.
            Works for both built-in and custom providers.
          </div>
        </div>
      </div>

      {/* Add form */}
      <div className="cyber-card rounded-lg p-6 mb-6">
        <div className="text-cyber-muted text-xs tracking-widest uppercase mb-5 font-display">Add Provider Key</div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div>
            <label className="text-cyber-muted text-xs mb-1 block">Provider</label>
            <select
              className="cyber-input w-full px-3 py-2.5 rounded text-sm"
              value={form.provider}
              onChange={(e) => setForm({ ...DEFAULT_FORM, provider: e.target.value })}
            >
              <optgroup label="Built-in">
                {BUILTIN_PROVIDERS.map((p) => <option key={p} value={p}>{p.toUpperCase()}</option>)}
              </optgroup>
              <optgroup label="Custom">
                <option value="custom">CUSTOM (my own endpoint)</option>
              </optgroup>
            </select>
          </div>
          <div>
            <label className="text-cyber-muted text-xs mb-1 block">Key Name</label>
            <input
              className="cyber-input w-full px-3 py-2.5 rounded text-sm"
              placeholder={isCustom ? "e.g. My LLM Server" : "e.g. OpenAI Primary"}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
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

        {/* Custom provider fields */}
        {isCustom && (
          <div className="border border-cyber-purple/30 rounded-lg p-4 mb-4 bg-cyber-purple/5">
            <div className="text-cyber-purple text-xs font-display tracking-widest mb-4">CUSTOM ENDPOINT CONFIGURATION</div>

            <div className="mb-3">
              <label className="text-cyber-muted text-xs mb-1 block">Endpoint URL *</label>
              <input
                className="cyber-input w-full px-3 py-2.5 rounded text-sm"
                placeholder="https://my-llm-server.com/v1/chat/completions"
                value={form.customEndpoint}
                onChange={(e) => setForm({ ...form, customEndpoint: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
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
                  <input
                    className="cyber-input w-full px-3 py-2.5 rounded text-sm"
                    placeholder="X-API-Key"
                    value={form.customAuthHeader}
                    onChange={(e) => setForm({ ...form, customAuthHeader: e.target.value })}
                  />
                </div>
              )}

              {form.customAuthStyle === "query" && (
                <div>
                  <label className="text-cyber-muted text-xs mb-1 block">Query Param Name</label>
                  <input
                    className="cyber-input w-full px-3 py-2.5 rounded text-sm"
                    placeholder="api_key"
                    value={form.customAuthQuery}
                    onChange={(e) => setForm({ ...form, customAuthQuery: e.target.value })}
                  />
                </div>
              )}
            </div>

            <div className="mb-1">
              <label className="text-cyber-muted text-xs mb-1 block">
                Extra Headers <span className="opacity-60">(optional, JSON format)</span>
              </label>
              <input
                className="cyber-input w-full px-3 py-2.5 rounded text-sm font-mono-cyber"
                placeholder='{"X-Org-Id": "my-org", "X-Custom": "value"}'
                value={form.customHeaders}
                onChange={(e) => setForm({ ...form, customHeaders: e.target.value })}
              />
            </div>
          </div>
        )}

        {/* API Key input */}
        <div className="mb-4">
          <label className="text-cyber-muted text-xs mb-1 block">
            API Key {isCustom && <span className="opacity-60">(leave blank if no auth needed)</span>}
          </label>
          <input
            type="password"
            className="cyber-input w-full px-3 py-2.5 rounded text-sm"
            placeholder={isCustom ? "your-api-key (optional)" : "sk-..."}
            value={form.apiKey}
            onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
          />
        </div>

        <div className="flex items-center gap-3">
          <button onClick={add} disabled={loading} className="cyber-btn px-6 py-2.5 rounded">
            {loading ? "Adding..." : "Add Key"}
          </button>
          {msg && (
            <span className={`text-xs font-mono-cyber ${msg.ok ? "text-green-400" : "text-cyber-pink"}`}>
              {msg.text}
            </span>
          )}
        </div>
      </div>

      {/* Keys grouped by provider */}
      {allProviders.map((provider) => {
        const providerKeys = keys.filter((k) => k.provider === provider).sort((a, b) => a.priority - b.priority);
        if (providerKeys.length === 0 && provider === "custom") return null;
        return (
          <div key={provider} className="cyber-card rounded-lg p-6 mb-4">
            <div className="flex items-center gap-3 mb-4">
              <span className={`font-display text-xs tracking-widest uppercase ${provider === "custom" ? "neon-purple" : "neon-pink"}`}>
                {provider === "custom" ? "⬡ CUSTOM" : provider}
              </span>
              <span className="text-cyber-muted text-xs">({providerKeys.length} keys)</span>
            </div>

            {providerKeys.length === 0 ? (
              <div className="text-cyber-muted text-xs font-mono-cyber">No keys configured</div>
            ) : (
              <div className="space-y-2">
                {providerKeys.map((k) => (
                  <div key={k.id} className="flex items-center gap-4 bg-cyber-darker rounded px-4 py-3 border border-cyber-border/50">
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`w-2 h-2 rounded-full ${k.priority === 1 ? "bg-cyber-pink animate-pulse" : "bg-cyber-purple"}`} />
                      <span className="text-cyber-muted text-xs">P{k.priority}</span>
                    </div>
                    <span className="text-cyber-text text-xs flex-1 min-w-0">
                      {k.name}
                      {k.customEndpoint && (
                        <span className="text-cyber-muted ml-2 truncate">→ {k.customEndpoint}</span>
                      )}
                    </span>
                    <span className="text-cyber-muted text-xs font-mono-cyber flex-shrink-0">{k.keyPreview}</span>
                    {k.customAuthStyle && (
                      <span className="text-cyber-purple text-xs flex-shrink-0 border border-cyber-purple/40 px-2 py-0.5 rounded">
                        {k.customAuthStyle}
                      </span>
                    )}
                    <span className={`px-2 py-0.5 rounded text-xs flex-shrink-0 ${k.isActive ? "badge-active" : "badge-inactive"}`}>
                      {k.isActive ? "Active" : "Off"}
                    </span>
                    <span className="text-green-400 text-xs flex-shrink-0">✓ {k.successCount}</span>
                    <span className="text-cyber-pink text-xs flex-shrink-0">✗ {k.errorCount}</span>
                    {k.isActive && (
                      <button onClick={() => remove(k.id)} className="text-cyber-muted hover:text-cyber-pink text-xs transition-colors flex-shrink-0">
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
