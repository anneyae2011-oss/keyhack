"use client";
import { useState } from "react";

export function DocsPanel() {
  const [copied, setCopied] = useState("");

  const copy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(""), 2000);
  };

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://your-app.vercel.app";

  const curlExample = `curl -X POST ${baseUrl}/api/v1/chat/completions \\
  -H "Authorization: Bearer ntw_YOUR_GATEWAY_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gpt-4o-mini",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'`;

  const pythonExample = `import openai

client = openai.OpenAI(
    api_key="ntw_YOUR_GATEWAY_KEY",
    base_url="${baseUrl}/api/v1"
)

response = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "Hello!"}]
)
print(response.choices[0].message.content)`;

  const jsExample = `const response = await fetch("${baseUrl}/api/v1/chat/completions", {
  method: "POST",
  headers: {
    "Authorization": "Bearer ntw_YOUR_GATEWAY_KEY",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    model: "claude-3-5-sonnet-20241022",
    messages: [{ role: "user", content: "Hello!" }]
  })
});
const data = await response.json();`;

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-display font-black text-3xl neon-pink tracking-widest">API DOCS</h1>
        <p className="text-cyber-muted text-sm mt-1 font-mono-cyber">NanaTwo Gateway · OpenAI-compatible API</p>
      </div>

      {/* Endpoint */}
      <div className="cyber-card rounded-lg p-6 mb-6">
        <div className="text-cyber-muted text-xs tracking-widest uppercase mb-3 font-display">Base URL</div>
        <code className="text-cyber-pink font-mono-cyber text-sm">{baseUrl}/api/v1</code>
      </div>

      {/* Auth */}
      <div className="cyber-card rounded-lg p-6 mb-6">
        <div className="text-cyber-muted text-xs tracking-widest uppercase mb-3 font-display">Authentication</div>
        <p className="text-cyber-text text-sm font-mono-cyber mb-3">
          Pass your NanaTwo gateway key via the <code className="text-cyber-pink">Authorization</code> header or <code className="text-cyber-pink">X-Api-Key</code> header.
        </p>
        <CodeBlock code={`Authorization: Bearer ntw_YOUR_GATEWAY_KEY\n# or\nX-Api-Key: ntw_YOUR_GATEWAY_KEY`} id="auth" copied={copied} onCopy={copy} />
      </div>

      {/* Fallback headers */}
      <div className="cyber-card rounded-lg p-6 mb-6">
        <div className="text-cyber-muted text-xs tracking-widest uppercase mb-3 font-display">Response Headers</div>
        <div className="space-y-2 font-mono-cyber text-xs">
          {[
            ["X-NanaTwo-Provider", "Which provider handled the request"],
            ["X-NanaTwo-Fallback-Used", "true if a fallback key was used"],
            ["X-NanaTwo-Attempts", "Number of key attempts made"],
            ["X-NanaTwo-Latency-Ms", "Total gateway latency in ms"],
          ].map(([h, d]) => (
            <div key={h} className="flex gap-4">
              <code className="text-cyber-pink w-56 flex-shrink-0">{h}</code>
              <span className="text-cyber-muted">{d}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Supported models */}
      <div className="cyber-card rounded-lg p-6 mb-6">
        <div className="text-cyber-muted text-xs tracking-widest uppercase mb-3 font-display">Supported Providers & Models</div>
        <div className="grid grid-cols-2 gap-4 font-mono-cyber text-xs">
          {[
            { provider: "OpenAI", models: ["gpt-4o", "gpt-4o-mini", "o1", "o3-mini"] },
            { provider: "Anthropic", models: ["claude-3-5-sonnet-*", "claude-3-opus-*", "claude-3-haiku-*"] },
            { provider: "Google", models: ["gemini-1.5-pro", "gemini-1.5-flash", "gemini-2.0-flash"] },
            { provider: "Mistral", models: ["mistral-large", "mixtral-8x7b", "mistral-small"] },
          ].map(({ provider, models }) => (
            <div key={provider}>
              <div className="text-cyber-pink mb-1">{provider}</div>
              {models.map((m) => <div key={m} className="text-cyber-muted pl-2">· {m}</div>)}
            </div>
          ))}
        </div>
      </div>

      {/* Code examples */}
      <div className="space-y-6">
        <div className="cyber-card rounded-lg p-6">
          <div className="text-cyber-muted text-xs tracking-widest uppercase mb-3 font-display">cURL Example</div>
          <CodeBlock code={curlExample} id="curl" copied={copied} onCopy={copy} />
        </div>
        <div className="cyber-card rounded-lg p-6">
          <div className="text-cyber-muted text-xs tracking-widest uppercase mb-3 font-display">Python (OpenAI SDK)</div>
          <CodeBlock code={pythonExample} id="python" copied={copied} onCopy={copy} />
        </div>
        <div className="cyber-card rounded-lg p-6">
          <div className="text-cyber-muted text-xs tracking-widest uppercase mb-3 font-display">JavaScript / TypeScript</div>
          <CodeBlock code={jsExample} id="js" copied={copied} onCopy={copy} />
        </div>
      </div>
    </div>
  );
}

function CodeBlock({ code, id, copied, onCopy }: { code: string; id: string; copied: string; onCopy: (t: string, id: string) => void }) {
  return (
    <div className="relative">
      <pre className="bg-cyber-darker border border-cyber-border rounded p-4 text-xs font-mono-cyber text-cyber-text overflow-x-auto whitespace-pre">
        {code}
      </pre>
      <button
        onClick={() => onCopy(code, id)}
        className="absolute top-2 right-2 cyber-btn px-3 py-1 rounded text-xs"
      >
        {copied === id ? "Copied!" : "Copy"}
      </button>
    </div>
  );
}
